import { connection } from 'next/server';
import { DemoLock } from '../components/demo-lock';
import { getDemoInfo } from '../queries/get-demo-info';

/** AD-008: the children stay visible but disabled while the api reports the demo as locked. */
export async function DemoLockContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  // Request time only: the build has no api to ask.
  await connection();

  // A failing /demo leaves the form as it is; the api still answers 403.
  const info = await getDemoInfo().catch(() => null);

  return <DemoLock locked={info?.locked ?? false}>{children}</DemoLock>;
}
