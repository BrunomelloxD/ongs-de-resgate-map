import { connection } from 'next/server';
import { getDemoInfo } from '@/features/demo';
import type { SignupSlug } from '@/features/signup';
import { getEnv } from '@/lib/env';
import { SignupSteps } from './signup-steps.client';

/** Env and demo settings exist only at request time: the build has neither. */
export async function SignupStepContent({ slug }: { slug: SignupSlug }) {
  await connection();
  const { MAX_UPLOAD_MB, TILE_URL, TILE_ATTRIBUTION } = getEnv();
  const { enabled, retentionDays } = await getDemoInfo();

  return (
    <SignupSteps
      slug={slug}
      maxUploadMb={MAX_UPLOAD_MB}
      tileUrl={TILE_URL}
      attribution={TILE_ATTRIBUTION}
      demo={{ enabled, retentionDays }}
    />
  );
}
