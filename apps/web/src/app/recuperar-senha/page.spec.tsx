import { render, screen } from '@testing-library/react';
import ForgotPasswordRoute, { metadata } from './page';

const requestPasswordReset = vi.hoisted(() => vi.fn());

vi.mock('@/features/auth', () => ({
  authDictionary: { forgot: { metaTitle: 'Recuperar senha' } },
  requestPasswordReset,
  ForgotPasswordForm: ({ action }: { action: unknown }) => (
    <p>forgot-form {action === requestPasswordReset ? 'com a action' : ''}</p>
  ),
}));

vi.mock('@/features/demo', () => ({
  DemoLockContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="demo-lock">{children}</div>
  ),
}));

describe('/recuperar-senha', () => {
  it('compõe o formulário com a action de pedido de recuperação', () => {
    render(<ForgotPasswordRoute />);

    expect(screen.getByRole('main')).toHaveTextContent(
      'forgot-form com a action',
    );
  });

  it('o formulário fica dentro do bloqueio da demo fechada (DEP-19)', () => {
    render(<ForgotPasswordRoute />);

    expect(screen.getByTestId('demo-lock')).toHaveTextContent('forgot-form');
  });

  it('tem o título da página', () => {
    expect(metadata.title).toBe('Recuperar senha');
  });
});
