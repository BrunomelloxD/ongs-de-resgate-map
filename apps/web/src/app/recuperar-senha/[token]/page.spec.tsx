import { render, screen } from '@testing-library/react';
import ResetPasswordRoute, { metadata } from './page';

const received = vi.hoisted(() => ({ params: undefined as unknown }));

vi.mock('@/features/auth', () => ({
  authDictionary: { reset: { metaTitle: 'Nova senha' } },
  ResetPasswordContainer: ({ params }: { params: unknown }) => {
    received.params = params;
    return <p>reset-container</p>;
  },
}));

vi.mock('@/features/demo', () => ({
  DemoLockContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="demo-lock">{children}</div>
  ),
}));

describe('/recuperar-senha/[token]', () => {
  it('compõe a nova senha da feature e repassa o token da URL', () => {
    const params = Promise.resolve({ token: 'token-do-link' });

    render(
      <ResetPasswordRoute params={params} searchParams={Promise.resolve({})} />,
    );

    expect(screen.getByRole('main')).toHaveTextContent('reset-container');
    expect(received.params).toBe(params);
  });

  it('o formulário fica dentro do bloqueio da demo fechada (DEP-19)', () => {
    render(
      <ResetPasswordRoute
        params={Promise.resolve({ token: 't' })}
        searchParams={Promise.resolve({})}
      />,
    );

    expect(screen.getByTestId('demo-lock')).toHaveTextContent(
      'reset-container',
    );
  });

  it('tem o título da página', () => {
    expect(metadata.title).toBe('Nova senha');
  });
});
