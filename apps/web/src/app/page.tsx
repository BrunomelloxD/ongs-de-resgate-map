import { HomeHero } from '@/features/home';

// Static: no request data, so it is prerendered at build time.
export default function HomePage() {
  return <HomeHero />;
}
