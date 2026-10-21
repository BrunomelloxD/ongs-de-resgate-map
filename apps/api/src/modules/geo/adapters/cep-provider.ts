import { Injectable } from '@nestjs/common';
import { z } from 'zod';

export interface CepAddress {
  street: string;
  district: string;
  city: string;
  uf: string;
  lat?: number;
  lng?: number;
}

/** The CEP does not exist (LOC-10). */
export class CepNotFound extends Error {
  constructor() {
    super('CEP not found');
    this.name = 'CepNotFound';
  }
}

/** No provider answered within the deadline (LOC-11, SIGN-18). */
export class CepUnavailable extends Error {
  constructor() {
    super('CEP providers unavailable');
    this.name = 'CepUnavailable';
  }
}

/** Abstract class (not an interface) so it works as a DI token. */
export abstract class ICepProvider {
  /** `cep` has 8 digits. Rejects with CepNotFound or CepUnavailable. */
  abstract lookup(cep: string): Promise<CepAddress>;
}

const TIMEOUT_MS = 5_000;
const optionalText = z
  .string()
  .nullish()
  .transform((value) => value ?? '');
const coordinate = z.coerce.number().optional().catch(undefined);

const brasilApiSchema = z.object({
  street: optionalText,
  neighborhood: optionalText,
  city: z.string().min(1),
  state: z.string().length(2),
  // v2 always sends location; coordinates is {} when the CEP has none.
  location: z.object({
    coordinates: z.object({ latitude: coordinate, longitude: coordinate }),
  }),
});

// ViaCEP answers 200 with { erro: true } (or "true") for a CEP that does not exist.
const viaCepNotFound = z.object({
  erro: z.union([z.literal(true), z.literal('true')]),
});
const viaCepSchema = z.object({
  logradouro: optionalText,
  bairro: optionalText,
  localidade: z.string().min(1),
  uf: z.string().length(2),
});

type Outcome = CepAddress | 'not-found' | 'unavailable';

/** BrasilAPI v2 first (it has coordinates), ViaCEP as fallback; one 5 s budget for both. */
@Injectable()
export class HttpCepProvider extends ICepProvider {
  async lookup(cep: string): Promise<CepAddress> {
    // Same as AbortSignal.timeout, but on a regular timer the tests can fake.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      return await this.tryBoth(cep, controller.signal);
    } finally {
      clearTimeout(timer);
    }
  }

  private async tryBoth(cep: string, signal: AbortSignal): Promise<CepAddress> {
    const first = await this.brasilApi(cep, signal);
    if (typeof first === 'object') {
      return first;
    }
    const second = await this.viaCep(cep, signal);
    if (typeof second === 'object') {
      return second;
    }
    // A provider that says "does not exist" outweighs one that is down.
    if (first === 'not-found' || second === 'not-found') {
      throw new CepNotFound();
    }
    throw new CepUnavailable();
  }

  private async brasilApi(cep: string, signal: AbortSignal): Promise<Outcome> {
    const response = await get(
      `https://brasilapi.com.br/api/cep/v2/${cep}`,
      signal,
    );
    if (response === 'not-found' || response === 'unavailable') {
      return response;
    }
    const parsed = brasilApiSchema.safeParse(response);
    if (!parsed.success) {
      return 'unavailable';
    }
    const { street, neighborhood, city, state, location } = parsed.data;
    const { latitude, longitude } = location.coordinates;
    return {
      street,
      district: neighborhood,
      city,
      uf: state,
      ...(latitude !== undefined && longitude !== undefined
        ? { lat: latitude, lng: longitude }
        : {}),
    };
  }

  private async viaCep(cep: string, signal: AbortSignal): Promise<Outcome> {
    const response = await get(`https://viacep.com.br/ws/${cep}/json/`, signal);
    if (response === 'not-found' || response === 'unavailable') {
      return response;
    }
    if (viaCepNotFound.safeParse(response).success) {
      return 'not-found';
    }
    const parsed = viaCepSchema.safeParse(response);
    if (!parsed.success) {
      return 'unavailable';
    }
    const { logradouro, bairro, localidade, uf } = parsed.data;
    return { street: logradouro, district: bairro, city: localidade, uf };
  }
}

/** JSON body, or why there is none. Network errors and the timeout count as unavailable. */
async function get(url: string, signal: AbortSignal): Promise<unknown> {
  try {
    const response = await fetch(url, {
      signal,
      headers: { Accept: 'application/json' },
    });
    if (response.status === 404) {
      return 'not-found';
    }
    if (!response.ok) {
      return 'unavailable';
    }
    return (await response.json()) as unknown;
  } catch {
    return 'unavailable';
  }
}
