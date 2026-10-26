import type { PlaceSearchProps } from './map.types';

/** Campinas: where the fake search always lands. */
export const FAKE_PLACE = { lat: -22.9056, lng: -47.0608 };

/**
 * Stands in for the location feature's "Cidade ou CEP" in tests and stories:
 * a labelled field whose submit reports `FAKE_PLACE`.
 */
export function FakePlaceSearch({
  label,
  variant = 'field',
  submitLabel,
  trailing,
  onPlace,
}: PlaceSearchProps) {
  return (
    <form
      data-variant={variant}
      onSubmit={(event) => {
        event.preventDefault();
        onPlace(FAKE_PLACE);
      }}
      className="flex flex-col gap-2"
    >
      <label className="flex flex-col gap-2 font-semibold">
        {label}
        <input className="min-h-13 rounded-field border border-line bg-surface px-4" />
      </label>
      {trailing}
      {submitLabel && <button type="submit">{submitLabel}</button>}
    </form>
  );
}
