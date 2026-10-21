import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AppConfigService } from '@/common/config/app-config.service.js';

export interface Coordinates {
  lat: number;
  lng: number;
}

/** Abstract class (not an interface) so it works as a DI token. */
export abstract class IGeocoder {
  /** null when the address is not found or the provider fails (SIGN-20). */
  abstract geocode(address: string): Promise<Coordinates | null>;
}

// Nominatim usage policy: at most 1 request per second.
const MIN_INTERVAL_MS = 1_000;
// Without a deadline, one hanging request would stall the queue.
const TIMEOUT_MS = 5_000;
const CACHE_SIZE = 500;

const responseSchema = z.array(
  z.object({ lat: z.coerce.number(), lon: z.coerce.number() }),
);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable()
export class NominatimGeocoder extends IGeocoder {
  // Map keeps insertion order: the first key is the least recently used.
  private readonly cache = new Map<string, Coordinates | null>();
  private queue: Promise<unknown> = Promise.resolve();
  private lastRequestAt = Number.NEGATIVE_INFINITY;

  constructor(private readonly config: AppConfigService) {
    super();
  }

  async geocode(address: string): Promise<Coordinates | null> {
    const key = address.trim().toLowerCase();
    if (this.cache.has(key)) {
      const hit = this.cache.get(key)!;
      this.remember(key, hit);
      return hit;
    }

    const result = this.queue.then(() => this.throttled(address));
    this.queue = result;
    const coordinates = await result;
    if (coordinates !== undefined) {
      this.remember(key, coordinates);
    }
    return coordinates ?? null;
  }

  private async throttled(
    address: string,
  ): Promise<Coordinates | null | undefined> {
    const wait = this.lastRequestAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) {
      await sleep(wait);
    }
    this.lastRequestAt = Date.now();
    return this.request(address);
  }

  /** undefined = the provider failed: the answer is not cached. */
  private async request(
    address: string,
  ): Promise<Coordinates | null | undefined> {
    const { url, userAgent } = this.config.nominatim;
    const query = new URLSearchParams({
      q: address,
      format: 'jsonv2',
      limit: '1',
      countrycodes: 'br',
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(`${url}/search?${query}`, {
        signal: controller.signal,
        headers: { 'User-Agent': userAgent, 'Accept-Language': 'pt-BR' },
      });
      if (!response.ok) {
        return undefined;
      }
      const parsed = responseSchema.safeParse(await response.json());
      if (!parsed.success) {
        return undefined;
      }
      const [first] = parsed.data;
      return first ? { lat: first.lat, lng: first.lon } : null;
    } catch {
      return undefined;
    } finally {
      clearTimeout(timer);
    }
  }

  private remember(key: string, value: Coordinates | null): void {
    this.cache.delete(key);
    this.cache.set(key, value);
    if (this.cache.size > CACHE_SIZE) {
      this.cache.delete(this.cache.keys().next().value!);
    }
  }
}
