/** The three WebP variants the api keeps of an animal photo (T174). */
export interface AnimalImageVariants {
  thumbUrl: string;
  mediumUrl: string;
  url: string;
}

/** PERF-02: lets the browser pick the smallest variant that fills the slot. */
export function animalSrcSet({
  thumbUrl,
  mediumUrl,
  url,
}: AnimalImageVariants): string {
  return `${thumbUrl} 160w, ${mediumUrl} 600w, ${url} 1200w`;
}
