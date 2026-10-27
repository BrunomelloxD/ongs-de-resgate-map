import { connection } from 'next/server';
import { DemoAccountCard, getDemoInfo } from '@/features/demo';

/** DEP-18: the shared account's credentials, only in the locked demo (AD-008). */
export async function DemoAccount() {
  // Request time only: the build has no env to reach the api.
  await connection();
  const { account } = await getDemoInfo();

  return account ? <DemoAccountCard {...account} /> : null;
}
