import { Readable } from 'node:stream';
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import type { AppConfigService } from '@/common/config/app-config.service.js';
import { ObjectNotFound } from '../object-storage.js';
import { S3ObjectStorage } from '../s3-object-storage.js';

// Fake values: never the real bucket keys (SEC-08).
const S3_CONFIG = {
  endpoint: 'http://localhost:9000',
  region: 'us-east-1',
  bucket: 'test-bucket',
  accessKeyId: 'test-key',
  secretAccessKey: 'test-secret',
  forcePathStyle: true,
};

type Command =
  | PutObjectCommand
  | GetObjectCommand
  | ListObjectsV2Command
  | DeleteObjectsCommand;

function setup(forcePathStyle = true) {
  const send = vi.spyOn(S3Client.prototype, 'send');
  const storage = new S3ObjectStorage({
    s3: { ...S3_CONFIG, forcePathStyle },
  } as AppConfigService);
  const commands = () => send.mock.calls.map(([command]) => command as Command);
  return { send, storage, commands };
}

function s3Error(name: string): S3ServiceException {
  return new S3ServiceException({
    name,
    $fault: 'server',
    $metadata: { httpStatusCode: 503 },
    message: name,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('S3ObjectStorage', () => {
  it('liga o forcePathStyle conforme a configuração', async () => {
    const { storage } = setup(false);
    const client = (storage as unknown as { client: S3Client }).client;

    expect(client.config.forcePathStyle).toBe(false);
  });

  it('put grava no bucket com ContentType e CacheControl imutável', async () => {
    const { send, storage, commands } = setup();
    send.mockResolvedValue({} as never);

    await storage.put(
      'ngos/a/images/1-160.webp',
      Buffer.from('x'),
      'image/webp',
    );

    expect(commands()[0]).toBeInstanceOf(PutObjectCommand);
    expect(commands()[0].input).toEqual({
      Bucket: 'test-bucket',
      Key: 'ngos/a/images/1-160.webp',
      Body: Buffer.from('x'),
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=86400, immutable',
    });
  });

  it('getStream devolve o corpo do objeto', async () => {
    const { send, storage, commands } = setup();
    const body = Readable.from(['webp']);
    send.mockResolvedValue({ Body: body } as never);

    const stream = await storage.getStream('ngos/a/images/1-1200.webp');

    expect(stream).toBe(body);
    expect(commands()[0]).toBeInstanceOf(GetObjectCommand);
    expect(commands()[0].input).toEqual({
      Bucket: 'test-bucket',
      Key: 'ngos/a/images/1-1200.webp',
    });
  });

  it('getStream de chave inexistente lança ObjectNotFound', async () => {
    const { send, storage } = setup();
    send.mockRejectedValue(
      new NoSuchKey({ $metadata: {}, message: 'NoSuchKey' }) as never,
    );

    await expect(storage.getStream('ngos/a/x-160.webp')).rejects.toThrow(
      ObjectNotFound,
    );
  });

  it('getStream propaga outros erros do S3', async () => {
    const { send, storage } = setup();
    const error = s3Error('ServiceUnavailable');
    send.mockRejectedValue(error as never);

    await expect(storage.getStream('ngos/a/1-160.webp')).rejects.toBe(error);
  });

  it('deleteKeys apaga em lotes de 1000', async () => {
    const { send, storage, commands } = setup();
    send.mockResolvedValue({} as never);
    const keys = Array.from({ length: 1001 }, (_, i) => `ngos/a/${i}.webp`);

    await storage.deleteKeys(keys);

    const deletes = commands() as DeleteObjectsCommand[];
    expect(deletes).toHaveLength(2);
    expect(deletes[0].input.Bucket).toBe('test-bucket');
    expect(deletes[0].input.Delete?.Objects).toHaveLength(1000);
    expect(deletes[1].input.Delete?.Objects).toEqual([
      { Key: 'ngos/a/1000.webp' },
    ]);
  });

  it('deleteKeys sem chaves não chama o S3', async () => {
    const { send, storage } = setup();

    await storage.deleteKeys([]);

    expect(send).not.toHaveBeenCalled();
  });

  it('deletePrefix com 2 páginas soma count e bytes', async () => {
    const { send, storage, commands } = setup();
    send
      .mockResolvedValueOnce({
        Contents: [
          { Key: 'ngos/a/images/1-160.webp', Size: 100 },
          { Key: 'ngos/a/images/1-1200.webp', Size: 900 },
        ],
        IsTruncated: true,
        NextContinuationToken: 'page-2',
      } as never)
      .mockResolvedValueOnce({} as never)
      .mockResolvedValueOnce({
        Contents: [{ Key: 'ngos/a/logo/2-600.webp', Size: 500 }],
        IsTruncated: false,
      } as never)
      .mockResolvedValueOnce({} as never);

    const result = await storage.deletePrefix('ngos/a/');

    expect(result).toEqual({ count: 3, bytes: 1500 });
    const [list1, delete1, list2, delete2] = commands();
    expect(list1.input).toEqual({
      Bucket: 'test-bucket',
      Prefix: 'ngos/a/',
      ContinuationToken: undefined,
    });
    expect(delete1.input).toEqual({
      Bucket: 'test-bucket',
      Delete: {
        Objects: [
          { Key: 'ngos/a/images/1-160.webp' },
          { Key: 'ngos/a/images/1-1200.webp' },
        ],
        Quiet: true,
      },
    });
    expect(list2.input).toEqual({
      Bucket: 'test-bucket',
      Prefix: 'ngos/a/',
      ContinuationToken: 'page-2',
    });
    expect(delete2).toBeInstanceOf(DeleteObjectsCommand);
  });

  it('deletePrefix sem objetos devolve zeros sem apagar nada', async () => {
    const { send, storage } = setup();
    send.mockResolvedValueOnce({ KeyCount: 0 } as never);

    expect(await storage.deletePrefix('ngos/a/')).toEqual({
      count: 0,
      bytes: 0,
    });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('deletePrefix propaga erro do S3 na listagem', async () => {
    const { send, storage } = setup();
    const error = s3Error('InternalError');
    send.mockRejectedValue(error as never);

    await expect(storage.deletePrefix('ngos/a/')).rejects.toBe(error);
  });

  it('deletePrefix falha quando o S3 recusa apagar alguma chave', async () => {
    const { send, storage } = setup();
    send
      .mockResolvedValueOnce({
        Contents: [{ Key: 'ngos/a/1-160.webp', Size: 10 }],
      } as never)
      .mockResolvedValueOnce({
        Errors: [{ Key: 'ngos/a/1-160.webp', Code: 'AccessDenied' }],
      } as never);

    await expect(storage.deletePrefix('ngos/a/')).rejects.toThrow(
      'S3 could not delete 1 object(s): AccessDenied',
    );
  });
});
