import 'server-only';
import { createApiClient, type ApiClient } from '@repo/api-client';
import { getEnv } from './env';

export interface GetApiOptions {
  /** The visitor's IP, sent as `X-Client-IP` for the api rate limits (AD-002). */
  clientIp?: string;
  /** Session token, sent as `Authorization: Bearer` (AD-003). */
  token?: string;
}

/**
 * The only entry point to the API. Server-only.
 * Every call carries `X-Internal-Token` (AD-002).
 */
export function getApi({ clientIp, token }: GetApiOptions = {}): ApiClient {
  const env = getEnv();
  const client = createApiClient({ baseUrl: env.API_URL, token });

  client.use({
    onRequest({ request }) {
      request.headers.set('X-Internal-Token', env.INTERNAL_API_TOKEN);
      if (clientIp) request.headers.set('X-Client-IP', clientIp);
    },
  });

  return client;
}
