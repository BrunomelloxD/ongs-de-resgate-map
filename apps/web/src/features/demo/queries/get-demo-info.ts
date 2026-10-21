import 'server-only';
import { cacheLife } from 'next/cache';
import { getApi } from '@/lib/api';
import type { DemoInfo } from '../demo.types';

/** GET /demo (DEMO-01, DEMO-02, DEMO-20). The values only change when the api restarts. */
export async function getDemoInfo(): Promise<DemoInfo> {
  'use cache';
  cacheLife('minutes');

  const { data } = await getApi().GET('/api/v1/demo');
  if (!data) throw new Error('GET /demo failed.');

  return data;
}
