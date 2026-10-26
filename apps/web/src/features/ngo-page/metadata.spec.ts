import { makeNgo } from './test-fixtures';
import { ngoMetadata, ngoPath, ngoShare } from './metadata';

describe('ngoMetadata', () => {
  it('SHARE-04: og:title, og:description, og:image absoluta e canonical', () => {
    const ngo = makeNgo();

    expect(ngoMetadata(ngo)).toEqual({
      title: 'Patas do Bairro',
      description: ngo.description,
      alternates: { canonical: 'http://web.test/ong/patas-do-bairro' },
      openGraph: {
        type: 'website',
        url: 'http://web.test/ong/patas-do-bairro',
        title: 'Patas do Bairro',
        description: ngo.description,
        images: [`http://web.test${ngo.imageUrl}`],
      },
    });
  });

  it('ONG sem imagem → sem og:image', () => {
    expect(ngoMetadata(makeNgo({ imageUrl: null })).openGraph?.images).toEqual(
      [],
    );
  });

  it('ngoPath monta /ong/{slug}', () => {
    expect(ngoPath('patas-do-bairro')).toBe('/ong/patas-do-bairro');
  });
});

describe('ngoShare', () => {
  it('SHARE-01: título, texto e URL canônica da ONG', () => {
    const ngo = makeNgo();

    expect(ngoShare(ngo)).toEqual({
      title: 'Patas do Bairro',
      text: ngo.description,
      url: 'http://web.test/ong/patas-do-bairro',
    });
  });
});
