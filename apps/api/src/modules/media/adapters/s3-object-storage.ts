import type { Readable } from 'node:stream';
import { Injectable } from '@nestjs/common';
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { AppConfigService } from '@/common/config/app-config.service.js';
import {
  type DeletedObjects,
  IObjectStorage,
  ObjectNotFound,
} from './object-storage.js';

// Keys never change (a new id per upload), so the objects are immutable.
const CACHE_CONTROL = 'public, max-age=86400, immutable';
// DeleteObjects accepts at most 1000 keys per request.
const DELETE_BATCH = 1000;

/** Railway Bucket in production, MinIO in dev (forcePathStyle). */
@Injectable()
export class S3ObjectStorage extends IObjectStorage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: AppConfigService) {
    super();
    const { endpoint, region, bucket, accessKeyId, secretAccessKey } =
      config.s3;
    this.bucket = bucket;
    this.client = new S3Client({
      endpoint,
      region,
      forcePathStyle: config.s3.forcePathStyle,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: CACHE_CONTROL,
      }),
    );
  }

  async getStream(key: string): Promise<Readable> {
    try {
      const { Body } = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      // In Node the SDK body is an http.IncomingMessage, a Readable.
      return Body as Readable;
    } catch (error) {
      if (error instanceof NoSuchKey) {
        throw new ObjectNotFound(key);
      }
      throw error;
    }
  }

  async deleteKeys(keys: readonly string[]): Promise<void> {
    for (let i = 0; i < keys.length; i += DELETE_BATCH) {
      await this.deleteBatch(keys.slice(i, i + DELETE_BATCH));
    }
  }

  async deletePrefix(prefix: string): Promise<DeletedObjects> {
    const result = { count: 0, bytes: 0 };
    let token: string | undefined;

    do {
      // A page has at most 1000 keys, so it fits one DeleteObjects call.
      const page = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: token,
        }),
      );
      const contents = page.Contents ?? [];
      if (contents.length > 0) {
        await this.deleteBatch(contents.map((object) => object.Key!));
      }
      for (const object of contents) {
        result.count += 1;
        result.bytes += object.Size!;
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);

    return result;
  }

  private async deleteBatch(keys: readonly string[]): Promise<void> {
    const { Errors } = await this.client.send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
      }),
    );
    // A 200 response can still carry per-key failures.
    if (Errors && Errors.length > 0) {
      const codes = Errors.map((error) => error.Code).join(', ');
      throw new Error(
        `S3 could not delete ${Errors.length} object(s): ${codes}`,
      );
    }
  }
}
