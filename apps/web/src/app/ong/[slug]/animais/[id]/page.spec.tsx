import { render, screen } from '@testing-library/react';
import AnimalRoute, { generateMetadata, instant } from './page';

const getAnimal = vi.hoisted(() => vi.fn());
const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
);

vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/features/animal-page', () => ({
  getAnimal,
  animalMetadata: (animal: { name: string }) => ({
    title: `meta ${animal.name}`,
  }),
  animalShare: (animal: { name: string }) => ({
    title: animal.name,
    text: `texto ${animal.name}`,
    url: `https://web.test/${animal.name}`,
  }),
  AnimalDetail: ({
    animal,
    share,
  }: {
    animal: { name: string };
    share?: { title: string; text: string; url: string };
  }) => (
    <p>
      detalhe {animal.name} {share && `compartilha ${share.url}`}
    </p>
  ),
}));

const ANIMAL = { name: 'Caramelo' };

function props(slug = 'patas-do-bairro', id = 'abc') {
  return {
    params: Promise.resolve({ slug, id }),
    searchParams: Promise.resolve({}),
  } as PageProps<'/ong/[slug]/animais/[id]'>;
}

describe('/ong/[slug]/animais/[id]', () => {
  it('ANI-01: busca o animal pelo slug e id e mostra o detalhe', async () => {
    getAnimal.mockResolvedValue(ANIMAL);

    render(await AnimalRoute(props()));

    expect(getAnimal).toHaveBeenCalledWith('patas-do-bairro', 'abc');
    expect(screen.getByRole('main')).toHaveTextContent('detalhe Caramelo');
  });

  it('SHARE-01: o detalhe recebe o "Compartilhar" com a URL canônica do animal', async () => {
    getAnimal.mockResolvedValue(ANIMAL);

    render(await AnimalRoute(props()));

    expect(screen.getByRole('main')).toHaveTextContent(
      'compartilha https://web.test/Caramelo',
    );
  });

  it('ANI-06: null → notFound()', async () => {
    getAnimal.mockResolvedValue(null);

    await expect(AnimalRoute(props('outra', 'xyz'))).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
    expect(notFound).toHaveBeenCalled();
  });

  it('SHARE-04: a metadata vem do animal; null → notFound()', async () => {
    getAnimal.mockResolvedValueOnce(ANIMAL).mockResolvedValueOnce(null);

    await expect(generateMetadata(props())).resolves.toEqual({
      title: 'meta Caramelo',
    });
    await expect(generateMetadata(props())).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('é uma rota bloqueante, para o 404 ser um status HTTP real', () => {
    expect(instant).toBe(false);
  });
});
