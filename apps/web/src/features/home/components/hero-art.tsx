import { NgoListCard } from '@/components/ui/ngo-list-card';
import { PinPhoto } from '@/components/ui/pin-photo';
import { homeDictionary as t } from '../home.dictionary';

/** Photos in `public/photos/` (WebP, PERF-02); credits in features/demo/credits.json. */
export const HERO_PHOTOS = {
  dog: { src: '/photos/home-dog.webp', small: '/photos/home-dog-sm.webp' },
  cat: '/photos/home-cat.webp',
  shelter: {
    src: '/photos/home-shelter.webp',
    /** The 96px pin of the phone (figcraft "para-ongs"). */
    pin: '/photos/home-shelter-sm.webp',
    /** The 72px photo of the sample card. */
    thumb: '/photos/home-shelter-thumb.webp',
  },
} as const;

/**
 * Figcraft 01 "hero-arte": the dog and the cat cut in pins. On the phone a
 * 390×410 band above the title with the distance chip; from 1280px the right
 * column (shrunk below 1440px, so it never covers the title), with a sample NGO card floating. All of it is illustration.
 */
export function HeroArt() {
  return (
    <div
      data-slot="hero-art"
      aria-hidden="true"
      className="relative h-[410px] overflow-hidden xl:absolute xl:[zoom:0.8] min-[90rem]:[zoom:1] xl:top-0 xl:-right-5 xl:h-[700px] xl:w-[640px] xl:overflow-visible"
    >
      <div className="relative mx-auto h-full w-[390px] xl:w-full">
        <PinPhoto
          className="absolute top-3 left-32 h-[377px] w-[290px] xl:top-6 xl:left-25 xl:h-[650px] xl:w-[500px]"
          image={
            // The LCP of `/` on the phone: never lazy, fetched first (PERF-04).
            <img
              src={HERO_PHOTOS.dog.src}
              srcSet={`${HERO_PHOTOS.dog.small} 520w, ${HERO_PHOTOS.dog.src} 1000w`}
              sizes="(min-width: 1440px) 500px, (min-width: 1280px) 400px, 290px"
              alt=""
              width={1000}
              height={1300}
              fetchPriority="high"
            />
          }
        />
        {/* Page-coloured outline around the smaller pin. */}
        <PinPhoto
          className="absolute top-50 left-7 h-[171.6px] w-[132px] bg-page xl:top-95 xl:left-0 xl:h-[273px] xl:w-[210px]"
          image={
            <span className="mask-pin absolute inset-[2.86%]">
              <img
                src={HERO_PHOTOS.cat}
                alt=""
                width={400}
                height={520}
                // Leaves the bandwidth to the dog, the LCP (PERF-04).
                loading="lazy"
                className="size-full object-cover"
              />
            </span>
          }
        />
        <span className="absolute top-93 left-37.5 rounded-full bg-subtle px-2.5 py-1 text-xs font-semibold text-fg-secondary xl:hidden">
          {`${t.sample.name} · ${t.sample.distance}`}
        </span>
        <NgoListCard
          className="absolute top-140 left-77.5 hidden w-[330px] shadow-card xl:flex"
          thumb={
            <img
              src={HERO_PHOTOS.shelter.thumb}
              alt=""
              width={144}
              height={144}
              loading="lazy"
            />
          }
          name={t.sample.name}
          openNow
          distance={t.sample.distance}
          hours={t.sample.hours}
        />
      </div>
    </div>
  );
}
