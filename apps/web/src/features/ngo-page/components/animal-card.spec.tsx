import { render, screen } from '@testing-library/react';
import { makeNgoAnimal } from '../test-fixtures';
import { AnimalCard } from './animal-card';

const SUMMARY = 'Gato · Fêmea · Pequeno';
const HREF =
  '/ong/patas-do-bairro/animais/1d6a7c2e-3b4f-4a5d-9e8f-7a6b5c4d3e2f';

describe('AnimalCard', () => {
  it('A11Y-11/PERF-02: capa com o alt da api, width, height e loading="lazy"', () => {
    render(<AnimalCard animal={makeNgoAnimal()} href={HREF} />);
    const img = screen.getByRole('img', { name: 'Mel, gato, porte pequeno' });

    expect(img).toHaveAttribute('src', makeNgoAnimal().cover!.url);
    expect(img).toHaveAttribute('width', '1200');
    expect(img).toHaveAttribute('height', '900');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('PERF-02/T175: a capa tem srcset com as variantes de 160, 600 e 1200 e sizes da grade', () => {
    render(<AnimalCard animal={makeNgoAnimal()} href={HREF} />);
    const img = screen.getByRole('img', { name: 'Mel, gato, porte pequeno' });
    const { cover } = makeNgoAnimal();

    expect(img).toHaveAttribute(
      'srcset',
      `${cover!.thumbUrl} 160w, ${cover!.mediumUrl} 600w, ${cover!.url} 1200w`,
    );
    // 2 columns with 16 px gutters and gap below 1024 px; 3 columns of ~220 px above.
    expect(img).toHaveAttribute(
      'sizes',
      '(min-width: 1024px) 220px, calc(50vw - 24px)',
    );
  });

  it('nome, espécie, sexo, porte e link para a página do animal', () => {
    render(<AnimalCard animal={makeNgoAnimal()} href={HREF} />);

    expect(screen.getByRole('heading', { name: 'Mel' })).toBeInTheDocument();
    // T189 (C-23): the figcraft's line is "Espécie · Sexo · Porte", without the age.
    expect(screen.getByText(SUMMARY)).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', HREF);
  });

  it('NGO-07: disponível não tem o selo "Indisponível"; C-23: tem o "Disponível" na foto', () => {
    const { container } = render(
      <AnimalCard animal={makeNgoAnimal()} href={HREF} />,
    );

    expect(screen.queryByText('Indisponível')).not.toBeInTheDocument();
    expect(screen.getByText('Disponível').closest('.aspect-\\[3\\/4\\]')).toBe(
      container.querySelector('.aspect-\\[3\\/4\\]'),
    );
  });

  it('NGO-07: indisponível mostra o selo "Indisponível"', () => {
    render(
      <AnimalCard animal={makeNgoAnimal({ available: false })} href={HREF} />,
    );

    expect(screen.getByText('Indisponível')).toBeInTheDocument();
  });

  it('sem capa mostra o placeholder', () => {
    const { container } = render(
      <AnimalCard animal={makeNgoAnimal({ cover: null })} href={HREF} />,
    );

    expect(container.querySelector('img')).toBeNull();
    expect(
      container.querySelector('[data-slot="animal-card-placeholder"]'),
    ).toBeInTheDocument();
  });
});
