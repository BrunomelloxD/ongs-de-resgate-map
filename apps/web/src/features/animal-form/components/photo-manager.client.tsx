'use client';

import {
  ChevronLeft,
  ChevronRight,
  ImageOff,
  LoaderCircle,
  Plus,
  Star,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { FieldError } from '@/components/ui/error-summary';
import { useAnnounce } from '@/components/ui/live-region.client';
import { cn } from '@/lib/utils';
import { animalFormDictionary } from '../animal-form.dictionary';
import type { Photo, UploadPhoto } from '../animal-form.types';
import { ANIMAL_PHOTO_ACCEPT, isAcceptedAnimalPhoto } from '../photo-file';

const t = animalFormDictionary;

/** `id` of the "Adicionar foto" button: the error summary links to it. */
export const PHOTOS_FIELD_ID = 'animal-photos';
const HINT_ID = `${PHOTOS_FIELD_ID}-hint`;
const ERROR_ID = `${PHOTOS_FIELD_ID}-error`;

type Action = 'left' | 'right' | 'cover' | 'add';

export interface PhotoManagerProps {
  /** In order; the first is the cover. */
  photos: Photo[];
  onChange: React.Dispatch<React.SetStateAction<Photo[]>>;
  /** AFORM-07: 8, or DEMO_MAX_IMAGES_PER_ANIMAL with the demo on. */
  max: number;
  /** MAX_UPLOAD_MB (AFORM-08). */
  maxUploadMb: number;
  /** The `uploadPhoto` Server Action. */
  upload: UploadPhoto;
  /** Error from the form submit (AFORM-05). */
  error?: string;
}

let lastKey = 0;
const newKey = () => `photo-${++lastKey}`;

const ICON_BUTTON =
  'touch-target inline-flex shrink-0 items-center justify-center rounded-full bg-surface text-fg shadow-card outline-none hover:bg-subtle focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-40';

/** AFORM-07 to AFORM-11: preview, upload state per photo, order and cover. */
export function PhotoManager({
  photos,
  onChange,
  max,
  maxUploadMb,
  upload,
  error,
}: PhotoManagerProps) {
  const announce = useAnnounce();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const dragFrom = useRef<number | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string>();
  const [brokenPreviews, setBrokenPreviews] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [focusTarget, setFocusTarget] = useState<{
    key: string;
    action: Action;
  } | null>(null);

  // A move re-renders the list: keep the keyboard on the photo that moved.
  useEffect(() => {
    if (!focusTarget) return;
    if (focusTarget.action === 'add') {
      document.getElementById(PHOTOS_FIELD_ID)?.focus();
      setFocusTarget(null);
      return;
    }
    const item = listRef.current?.querySelector(
      `[data-photo-key="${focusTarget.key}"]`,
    );
    const button =
      item?.querySelector<HTMLButtonElement>(
        `[data-action="${focusTarget.action}"]:not(:disabled)`,
      ) ??
      item?.querySelector<HTMLButtonElement>(
        '[data-action="left"]:not(:disabled), [data-action="right"]:not(:disabled)',
      );
    button?.focus();
    setFocusTarget(null);
  }, [focusTarget]);

  async function send(photo: Photo) {
    const body = new FormData();
    body.set('file', photo.file!);
    // A dropped request rejects instead of answering { ok: false }.
    const result = await upload(body).catch(() => ({
      ok: false as const,
      error: t.upload.failed,
    }));
    if (!result.ok) announce(result.error);
    onChange((list) =>
      list.map((item) => {
        if (item.key !== photo.key) return item;
        return result.ok
          ? { ...item, status: 'done', id: result.id, error: undefined }
          : { ...item, status: 'error', error: result.error };
      }),
    );
  }

  function onPicked(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files!);
    // Lets the NGO pick the same file again after removing it.
    event.target.value = '';
    const accepted = files.filter((file) =>
      isAcceptedAnimalPhoto(file, maxUploadMb),
    );
    const room = max - photos.length;
    const added: Photo[] = accepted.slice(0, room).map((file) => ({
      key: newKey(),
      status: 'uploading',
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    if (accepted.length < files.length) {
      setFileError(t.upload.invalid(maxUploadMb));
    } else if (accepted.length > room) {
      setFileError(t.photos.tooMany(max));
    } else {
      setFileError(undefined);
    }
    if (added.length === 0) return;
    onChange((list) => [...list, ...added]);
    for (const photo of added) void send(photo);
  }

  function retry(photo: Photo) {
    onChange((list) =>
      list.map((item) =>
        item.key === photo.key
          ? { ...item, status: 'uploading', error: undefined }
          : item,
      ),
    );
    void send(photo);
  }

  function remove(photo: Photo) {
    if (photo.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photo.previewUrl);
    }
    onChange((list) => list.filter((item) => item.key !== photo.key));
    announce(t.photos.removed);
    // The button left with the photo: keep the focus in the field.
    setFocusTarget({ key: '', action: 'add' });
  }

  function move(from: number, to: number, action?: Action) {
    const next = [...photos];
    const [photo] = next.splice(from, 1);
    next.splice(to, 0, photo!);
    onChange(next);
    announce(
      to === 0 ? t.photos.madeCover : t.photos.moved(to + 1, next.length),
    );
    if (action) setFocusTarget({ key: photo!.key, action });
  }

  function onPointerUp(event: React.PointerEvent) {
    const from = dragFrom.current;
    dragFrom.current = null;
    setDragging(null);
    if (from === null) return;
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-photo-index]');
    if (!target) return;
    const to = Number(target.dataset['photoIndex']);
    if (to !== from) move(from, to);
  }

  const shownError = fileError ?? error;
  const full = photos.length >= max;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-bold">
          {t.photos.title(photos.length, max)}
        </h2>
        <p id={HINT_ID} className="text-sm text-fg-secondary">
          {t.photos.hint(max, maxUploadMb)}
        </p>
      </div>

      {photos.length > 0 && (
        <ul ref={listRef} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((photo, index) => (
            <li
              key={photo.key}
              data-photo-key={photo.key}
              data-photo-index={index}
            >
              <div
                role="group"
                aria-label={t.photos.position(index + 1, photos.length)}
                className="flex flex-col gap-2"
              >
                <div
                  data-slot="photo-drag-area"
                  onPointerDown={(event) => {
                    // Buttons on the photo keep their own click.
                    const target = event.target as HTMLElement;
                    if (event.button > 0 || target.closest('button')) return;
                    dragFrom.current = index;
                    event.currentTarget.setPointerCapture?.(event.pointerId);
                    setDragging(photo.key);
                  }}
                  onPointerUp={onPointerUp}
                  onPointerCancel={() => {
                    dragFrom.current = null;
                    setDragging(null);
                  }}
                  className={cn(
                    'relative aspect-square cursor-grab touch-none overflow-hidden rounded-2xl bg-surface-2 select-none',
                    dragging === photo.key && 'cursor-grabbing opacity-60',
                  )}
                >
                  {brokenPreviews.has(photo.key) ? (
                    // HEIC has no preview outside Safari; the api converts it anyway.
                    <div
                      aria-hidden="true"
                      className="flex size-full items-center justify-center"
                    >
                      <ImageOff className="size-8 text-fg-muted" />
                    </div>
                  ) : (
                    <img
                      src={photo.previewUrl}
                      alt={photo.alt ?? t.photos.alt(index + 1)}
                      width={160}
                      height={160}
                      draggable={false}
                      onError={() =>
                        setBrokenPreviews((keys) =>
                          new Set(keys).add(photo.key),
                        )
                      }
                      className="size-full object-cover"
                    />
                  )}
                  {index === 0 ? (
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-gem-soft px-2 py-1 text-xs font-bold text-gem-soft-fg">
                      <Star aria-hidden="true" className="size-3" />
                      {t.photos.cover}
                    </span>
                  ) : (
                    <button
                      type="button"
                      data-action="cover"
                      aria-label={t.photos.useAsCover}
                      onClick={() => move(index, 0, 'cover')}
                      className={cn(ICON_BUTTON, 'absolute top-1 left-1')}
                    >
                      <Star aria-hidden="true" className="size-5" />
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={t.photos.remove}
                    onClick={() => remove(photo)}
                    className={cn(ICON_BUTTON, 'absolute top-1 right-1')}
                  >
                    <X aria-hidden="true" className="size-5" />
                  </button>
                  {photo.status === 'uploading' && (
                    <p className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-surface/90 py-1 text-sm font-semibold">
                      <LoaderCircle
                        aria-hidden="true"
                        className="size-4 animate-spin motion-reduce:animate-none"
                      />
                      {t.photos.uploading}
                    </p>
                  )}
                </div>
                {photo.status === 'error' && (
                  <div className="flex flex-col items-start gap-1">
                    <FieldError id={`${photo.key}-error`}>
                      {photo.error}
                    </FieldError>
                    <button
                      type="button"
                      onClick={() => retry(photo)}
                      aria-describedby={`${photo.key}-error`}
                      className="touch-target inline-flex items-center font-semibold text-brand-text underline outline-none focus-visible:outline-3 focus-visible:outline-focus"
                    >
                      {t.photos.retry}
                    </button>
                  </div>
                )}
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    data-action="left"
                    aria-label={t.photos.moveLeft}
                    disabled={index === 0}
                    onClick={() => move(index, index - 1, 'left')}
                    className={ICON_BUTTON}
                  >
                    <ChevronLeft aria-hidden="true" className="size-5" />
                  </button>
                  <button
                    type="button"
                    data-action="right"
                    aria-label={t.photos.moveRight}
                    disabled={index === photos.length - 1}
                    onClick={() => move(index, index + 1, 'right')}
                    className={ICON_BUTTON}
                  >
                    <ChevronRight aria-hidden="true" className="size-5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ANIMAL_PHOTO_ACCEPT}
        onChange={onPicked}
        tabIndex={-1}
        aria-hidden="true"
        className="hidden"
      />
      <div>
        <button
          id={PHOTOS_FIELD_ID}
          type="button"
          disabled={full}
          onClick={() => inputRef.current?.click()}
          aria-invalid={shownError ? true : undefined}
          aria-describedby={[HINT_ID, shownError && ERROR_ID]
            .filter(Boolean)
            .join(' ')}
          className="touch-target inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-input px-4 py-4 font-semibold text-brand-text outline-none hover:bg-subtle focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-error"
        >
          <Plus aria-hidden="true" className="size-5" />
          {t.photos.add}
        </button>
      </div>
      {shownError && <FieldError id={ERROR_ID}>{shownError}</FieldError>}
    </div>
  );
}
