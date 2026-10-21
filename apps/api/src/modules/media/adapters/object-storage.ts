import { Readable } from 'node:stream';

export interface DeletedObjects {
  count: number;
  bytes: number;
}

/** The key is not in the bucket; the caller decides what that means (usually 404). */
export class ObjectNotFound extends Error {
  constructor(readonly key: string) {
    super(`Object not found: ${key}`);
    this.name = 'ObjectNotFound';
  }
}

/** Abstract class (not an interface) so it works as a DI token. */
export abstract class IObjectStorage {
  abstract put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** Rejects with ObjectNotFound when the key does not exist. */
  abstract getStream(key: string): Promise<Readable>;
  abstract deleteKeys(keys: readonly string[]): Promise<void>;
  abstract deletePrefix(prefix: string): Promise<DeletedObjects>;
}

/** Test double that keeps the objects in a Map. */
export class InMemoryObjectStorage extends IObjectStorage {
  private readonly objects = new Map<string, Buffer>();

  put(key: string, body: Buffer, _contentType: string): Promise<void> {
    this.objects.set(key, body);
    return Promise.resolve();
  }

  getStream(key: string): Promise<Readable> {
    const body = this.objects.get(key);
    if (body === undefined) {
      return Promise.reject(new ObjectNotFound(key));
    }
    return Promise.resolve(Readable.from([body]));
  }

  deleteKeys(keys: readonly string[]): Promise<void> {
    for (const key of keys) {
      this.objects.delete(key);
    }
    return Promise.resolve();
  }

  deletePrefix(prefix: string): Promise<DeletedObjects> {
    const result = { count: 0, bytes: 0 };
    for (const [key, body] of this.objects) {
      if (key.startsWith(prefix)) {
        this.objects.delete(key);
        result.count += 1;
        result.bytes += body.length;
      }
    }
    return Promise.resolve(result);
  }

  keys(): string[] {
    return [...this.objects.keys()].sort();
  }
}
