import { render, screen, within } from '@testing-library/react';
import HomePage from './page';

vi.mock('@/features/home', async (importOriginal) => ({
  homeDictionary: (await importOriginal<typeof import('@/features/home')>())
    .homeDictionary,
  HomeHero: ({ notice }: { notice?: React.ReactNode }) => (
    <>
      <p>home-hero</p>
      {notice}
    </>
  ),
  AccountDeletedContainer: ({
    searchParams,
  }: {
    searchParams: Promise<Record<string, string>>;
  }) => <p>aviso {searchParams instanceof Promise ? 'com params' : ''}</p>,
}));

describe('HomePage', () => {
  it('compõe a feature home (HOME-01)', () => {
    render(
      <HomePage
        searchParams={Promise.resolve({})}
        params={Promise.resolve({})}
      />,
    );

    expect(screen.getByText('home-hero')).toBeInTheDocument();
  });

  it('PROF-08: passa a query string para o aviso de conta excluída', () => {
    render(
      <HomePage
        searchParams={Promise.resolve({ conta: 'excluida' })}
        params={Promise.resolve({})}
      />,
    );

    expect(screen.getByText('aviso com params')).toBeInTheDocument();
  });

  // Moved from home-hero.spec.tsx (T182): the header and the footer are the page's now.
  it('HOME-03: o link "Sou uma ONG" leva a /entrar', () => {
    render(
      <HomePage
        searchParams={Promise.resolve({})}
        params={Promise.resolve({})}
      />,
    );

    expect(
      within(screen.getByRole('banner')).getByRole('link', {
        name: 'Sou uma ONG',
      }),
    ).toHaveAttribute('href', '/entrar');
  });

  it('mantém o botão de tema com os dois rótulos, agora no rodapé', () => {
    render(
      <HomePage
        searchParams={Promise.resolve({})}
        params={Promise.resolve({})}
      />,
    );

    const toggle = within(screen.getByRole('contentinfo')).getByRole('button', {
      name: /Usar tema escuro/,
    });
    expect(toggle).toHaveTextContent('Usar tema escuro');
    expect(toggle).toHaveTextContent('Usar tema claro');
  });

  it('T182: o cabeçalho vem antes da home e o rodapé depois', () => {
    render(
      <HomePage
        searchParams={Promise.resolve({})}
        params={Promise.resolve({})}
      />,
    );

    const hero = screen.getByText('home-hero');
    expect(
      screen.getByRole('banner').compareDocumentPosition(hero) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      hero.compareDocumentPosition(screen.getByRole('contentinfo')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
