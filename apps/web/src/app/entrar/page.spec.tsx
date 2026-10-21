import { render, screen } from '@testing-library/react';
import LoginRoute, { metadata } from './page';

const received = vi.hoisted(() => ({ searchParams: undefined as unknown }));

vi.mock('@/features/auth', () => ({
  authDictionary: { login: { metaTitle: 'Entrar' } },
  LoginContainer: ({ searchParams }: { searchParams: unknown }) => {
    received.searchParams = searchParams;
    return <p>login-container</p>;
  },
}));

describe('/entrar', () => {
  it('compõe o login da feature e repassa os parâmetros da URL', () => {
    const searchParams = Promise.resolve({ email: 'contato@patas.org' });

    render(
      <LoginRoute params={Promise.resolve({})} searchParams={searchParams} />,
    );

    expect(screen.getByRole('main')).toHaveTextContent('login-container');
    expect(received.searchParams).toBe(searchParams);
  });

  it('tem o título da página', () => {
    expect(metadata.title).toBe('Entrar');
  });
});
