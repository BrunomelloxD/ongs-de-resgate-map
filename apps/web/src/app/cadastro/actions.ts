'use server';

import { uploadNgoImage } from '@/features/ngo-account';
import { createAccount as createSignupAccount } from '@/features/signup';

/** "Criar conta" (SIGN-28): the signup with the image upload of `ngo-account`. */
export async function createAccount(formData: FormData) {
  return createSignupAccount(formData, uploadNgoImage);
}
