import { animalMetadata, animalPath, animalShare } from './metadata';
import { makeAnimal } from './test-fixtures';

const ID = '1d6a7c2e-3b4f-4a5d-9e8f-7a6b5c4d3e2f';
const URL_ = `http://web.test/ong/patas-do-bairro/animais/${ID}`;

describe('animalMetadata', () => {
  it('SHARE-04: og:image = URL absoluta da capa, canonical e textos', () => {
    const animal = makeAnimal();

    expect(animalMetadata(animal)).toEqual({
      title: 'Caramelo · Patas do Bairro',
      description: animal.description,
      alternates: { canonical: URL_ },
      openGraph: {
        type: 'website',
        url: URL_,
        title: 'Caramelo',
        description: animal.description,
        images: [
          {
            url: `http://web.test${animal.images[0]!.url}`,
            width: 1200,
            height: 900,
            alt: 'Caramelo, cão, porte médio',
          },
        ],
      },
    });
  });

  it('sem descrição e sem fotos → texto padrão e sem og:image', () => {
    const metadata = animalMetadata(
      makeAnimal({ description: null, images: [] }),
    );

    expect(metadata.description).toBe(
      'Conheça Caramelo, da Patas do Bairro, no Animal Helper.',
    );
    expect(metadata.openGraph?.images).toEqual([]);
  });

  it('animalPath monta /ong/{slug}/animais/{id}', () => {
    expect(animalPath('patas-do-bairro', ID)).toBe(
      `/ong/patas-do-bairro/animais/${ID}`,
    );
  });
});

describe('animalShare', () => {
  it('SHARE-01: título, texto e URL canônica do animal', () => {
    const animal = makeAnimal();

    expect(animalShare(animal)).toEqual({
      title: 'Caramelo · Patas do Bairro',
      text: animal.description,
      url: URL_,
    });
  });

  it('sem descrição → o texto padrão', () => {
    expect(animalShare(makeAnimal({ description: null })).text).toBe(
      'Conheça Caramelo, da Patas do Bairro, no Animal Helper.',
    );
  });
});
