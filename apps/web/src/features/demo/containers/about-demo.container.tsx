import { connection } from 'next/server';
import { AboutDemo } from '../components/about-demo';
import credits from '../credits.json';
import { getDemoInfo } from '../queries/get-demo-info';

/** DEMO-02. The quotas come from the api at request time (cached by getDemoInfo). */
export async function AboutDemoContainer() {
  await connection();

  return <AboutDemo info={await getDemoInfo()} credits={credits} />;
}
