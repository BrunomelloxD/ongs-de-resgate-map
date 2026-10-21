import { createAccount } from './actions';

const mocks = vi.hoisted(() => ({
  createSignupAccount: vi.fn(async () => ({
    ok: false,
    step: null,
    error: 'x',
  })),
  uploadNgoImage: vi.fn(),
}));
vi.mock('@/features/signup', () => ({
  createAccount: mocks.createSignupAccount,
}));
vi.mock('@/features/ngo-account', () => ({
  uploadNgoImage: mocks.uploadNgoImage,
}));

describe('createAccount (app/cadastro)', () => {
  it('SIGN-28: chama o cadastro com o envio da imagem de ngo-account', async () => {
    const formData = new FormData();

    await expect(createAccount(formData)).resolves.toEqual({
      ok: false,
      step: null,
      error: 'x',
    });
    expect(mocks.createSignupAccount).toHaveBeenCalledWith(
      formData,
      mocks.uploadNgoImage,
    );
  });
});
