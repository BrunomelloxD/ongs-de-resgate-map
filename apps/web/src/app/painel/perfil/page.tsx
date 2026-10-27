import type { Metadata } from 'next';
import { AppBar } from '@/components/ui/app-bar';
import { getMyNgo } from '@/features/dashboard';
import { DemoExpiryNotice } from '@/features/demo';
import {
  changePassword,
  deleteAccount,
  ngoAccountDictionary,
  updateProfile,
  uploadNgoImage,
} from '@/features/ngo-account';
import { getEnv } from '@/lib/env';
import { ProfileSections } from './profile-sections.client';

const t = ngoAccountDictionary.page;

export const metadata: Metadata = { title: t.metaTitle };

// Blocking route: the session is checked before anything streams (AUTH-07). The
// session read also stops the build prerender before getEnv() runs.
export const instant = false;

/** PROF-01 to PROF-08, DEMO-06. */
export default async function ProfileRoute() {
  const ngo = await getMyNgo();
  const { MAX_UPLOAD_MB, TILE_URL, TILE_ATTRIBUTION } = getEnv();

  return (
    <main
      id="conteudo"
      className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-6 text-fg"
    >
      {/* DIRTY-01: the link asks before leaving the profile with changes. */}
      <AppBar
        title={t.metaTitle}
        titleAs="p"
        back={{ href: '/painel', label: t.back }}
      />
      <ProfileSections
        ngo={ngo}
        maxUploadMb={MAX_UPLOAD_MB}
        tileUrl={TILE_URL}
        attribution={TILE_ATTRIBUTION}
        notice={<DemoExpiryNotice expiresAt={ngo.expiresAt} now={new Date()} />}
        updateProfile={updateProfile}
        uploadImage={uploadNgoImage}
        changePassword={changePassword}
        deleteAccount={deleteAccount}
      />
    </main>
  );
}
