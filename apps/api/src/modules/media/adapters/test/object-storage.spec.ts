import { text } from 'node:stream/consumers';
import { InMemoryObjectStorage, ObjectNotFound } from '../object-storage.js';

const WEBP = 'image/webp';

describe('InMemoryObjectStorage', () => {
  it('getStream devolve o conteúdo gravado por put', async () => {
    const storage = new InMemoryObjectStorage();
    await storage.put('ngos/a/images/1-160.webp', Buffer.from('thumb'), WEBP);

    const stream = await storage.getStream('ngos/a/images/1-160.webp');

    expect(await text(stream)).toBe('thumb');
  });

  it('getStream de chave inexistente lança ObjectNotFound', async () => {
    const storage = new InMemoryObjectStorage();

    await expect(storage.getStream('ngos/a/images/x-160.webp')).rejects.toThrow(
      ObjectNotFound,
    );
  });

  it('deleteKeys remove só as chaves informadas', async () => {
    const storage = new InMemoryObjectStorage();
    await storage.put('ngos/a/images/1-160.webp', Buffer.from('1'), WEBP);
    await storage.put('ngos/a/images/1-1200.webp', Buffer.from('2'), WEBP);
    await storage.put('ngos/a/images/2-160.webp', Buffer.from('3'), WEBP);

    await storage.deleteKeys([
      'ngos/a/images/1-160.webp',
      'ngos/a/images/1-1200.webp',
    ]);

    expect(storage.keys()).toEqual(['ngos/a/images/2-160.webp']);
  });

  it('deletePrefix remove só as chaves do prefixo e devolve contagem e bytes', async () => {
    const storage = new InMemoryObjectStorage();
    await storage.put('ngos/a/images/1-160.webp', Buffer.alloc(100), WEBP);
    await storage.put('ngos/a/logo/2-600.webp', Buffer.alloc(250), WEBP);
    // Same leading characters, other NGO: must survive.
    await storage.put('ngos/ab/images/3-160.webp', Buffer.alloc(40), WEBP);

    const result = await storage.deletePrefix('ngos/a/');

    expect(result).toEqual({ count: 2, bytes: 350 });
    expect(storage.keys()).toEqual(['ngos/ab/images/3-160.webp']);
  });

  it('deletePrefix sem chaves devolve zeros', async () => {
    const storage = new InMemoryObjectStorage();

    expect(await storage.deletePrefix('ngos/a/')).toEqual({
      count: 0,
      bytes: 0,
    });
  });
});
