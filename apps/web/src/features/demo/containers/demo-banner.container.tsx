import { connection } from 'next/server';
import { DemoBanner } from '@/components/ui/demo-banner';
import { getDemoInfo } from '../queries/get-demo-info';

/** DEMO-01 / DEMO-20: the banner only exists while the api reports the demo as on. */
export async function DemoBannerContainer() {
  // Request time only: the build has no api to ask.
  await connection();

  // A failing /demo must not take every page down with it.
  const info = await getDemoInfo().catch(() => null);
  if (!info?.enabled) return null;

  return <DemoBanner days={info.retentionDays} />;
}
