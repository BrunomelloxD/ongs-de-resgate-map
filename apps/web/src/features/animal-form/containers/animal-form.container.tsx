import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getEnv } from '@/lib/env';
import { deleteAnimal } from '../actions/delete-animal';
import { saveAnimal } from '../actions/save-animal';
import { uploadPhoto } from '../actions/upload-photo';
import { animalFormDictionary } from '../animal-form.dictionary';
import type { MyAnimal, SetAvailability } from '../animal-form.types';
import { AnimalForm } from '../components/animal-form.client';
import { DASHBOARD_PATH } from '../paths';

const t = animalFormDictionary.page;

export interface AnimalFormContainerProps {
  /** The animal to edit (found by the page, so a missing one is a real 404); null creates. */
  animal: MyAnimal | null;
  /** From `photoLimit()` (AFORM-07). */
  maxPhotos: number;
  /** `toggleAvailability` of the dashboard, given by the app. */
  markUnavailable: SetAvailability;
  /** The DEMO-06 notice, given by the app. */
  notice?: React.ReactNode;
}

/** /painel/animais/novo and /painel/animais/[id]: title, way back and the form. */
export function AnimalFormContainer({
  animal,
  maxPhotos,
  markUnavailable,
  notice,
}: AnimalFormContainerProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-2">
        <Link
          href={DASHBOARD_PATH}
          className="touch-target inline-flex items-center gap-2 rounded-full font-semibold text-brand-text underline outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <ArrowLeft aria-hidden="true" className="size-5" />
          {t.back}
        </Link>
        <h1 className="font-heading text-4xl font-extrabold">
          {animal ? t.editTitle(animal.name) : t.newTitle}
        </h1>
      </div>
      <AnimalForm
        animal={animal}
        maxPhotos={maxPhotos}
        maxUploadMb={getEnv().MAX_UPLOAD_MB}
        uploadPhoto={uploadPhoto}
        saveAnimal={saveAnimal}
        deleteAnimal={deleteAnimal}
        markUnavailable={markUnavailable}
        notice={notice}
      />
    </div>
  );
}
