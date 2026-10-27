import { render, screen } from '@testing-library/react';
import NgoRoute, { generateMetadata, instant } from './page';

const getNgo = vi.hoisted(() => vi.fn());
const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
);

vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/features/ngo-page', () => ({
  getNgo,
  ngoMetadata: (ngo: { name: string }) => ({ title: `meta ${ngo.name}` }),
  NgoPageContainer: ({ ngo }: { ngo: { name: string } }) => (
    <p>container {ngo.name}</p>
  ),
}));

const NGO = { name: 'Patas do Bairro' };

function props(slug = 'patas-do-bairro') {
  return {
    params: Promise.resolve({ slug }),
    searchParams: Promise.resolve({}),
  } as PageProps<'/ong/[slug]'>;
}

describe('/ong/[slug]', () => {
  it('NGO-01: busca a ONG pelo slug e compõe a página', async () => {
    getNgo.mockResolvedValue(NGO);

    render(await NgoRoute(props()));

    expect(getNgo).toHaveBeenCalledWith('patas-do-bairro');
    expect(screen.getByRole('main')).toHaveTextContent(
      'container Patas do Bairro',
    );
  });

  it('NGO-11: ONG inexistente chama notFound() antes de renderizar', async () => {
    getNgo.mockResolvedValue(null);

    await expect(NgoRoute(props('nao-existe'))).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
    expect(notFound).toHaveBeenCalled();
  });

  it('SHARE-04: a metadata vem da ONG', async () => {
    getNgo.mockResolvedValue(NGO);

    await expect(generateMetadata(props())).resolves.toEqual({
      title: 'meta Patas do Bairro',
    });
  });

  it('NGO-11: metadata de ONG inexistente também chama notFound()', async () => {
    getNgo.mockResolvedValue(null);

    await expect(generateMetadata(props('nao-existe'))).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
  });

  it('é uma rota bloqueante, para o 404 ser um status HTTP real', () => {
    expect(instant).toBe(false);
  });

  it('T196: a navbar fica acima da página, em todas as larguras', async () => {
    getNgo.mockResolvedValue(NGO);

    render(await NgoRoute(props()));

    const banner = screen.getByRole('banner');
    expect(banner).toHaveAttribute('data-slot', 'navbar');
    expect(banner.className).not.toContain('max-lg:hidden');
    expect(
      banner.compareDocumentPosition(screen.getByRole('main')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'conteudo');
  });
});
