import type { Schemas } from '@repo/api-client';

export type DemoInfo = Schemas['DemoConfigResponseDto'];
export type DemoQuotas = Schemas['DemoQuotasDto'];

/** One entry of `credits.json` (example photos used by the seeds). */
export interface PhotoCredit {
  title: string;
  creator: string;
  license: string;
  licenseUrl: string;
  page: string;
}
