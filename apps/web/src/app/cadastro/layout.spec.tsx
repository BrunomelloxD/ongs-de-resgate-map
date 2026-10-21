import { render, screen } from '@testing-library/react';
import SignupLayout from './layout';

vi.mock('@/features/signup/client', () => ({
  SignupProvider: ({ children }: { children: React.ReactNode }) => (
    <section aria-label="provider">{children}</section>
  ),
}));

describe('/cadastro layout', () => {
  it('SIGN-02: o SignupProvider envolve as etapas', () => {
    render(
      <SignupLayout>
        <p>etapa</p>
      </SignupLayout>,
    );

    expect(screen.getByRole('region', { name: 'provider' })).toHaveTextContent(
      'etapa',
    );
  });
});
