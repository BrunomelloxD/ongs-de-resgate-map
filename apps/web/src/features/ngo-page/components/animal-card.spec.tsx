import { render, screen } from '@testing-library/react';
import { makeNgoAnimal } from '../test-fixtures';
import { AnimalCard } from './animal-card';

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

  it('nome, espécie, idade e link para a página do animal', () => {
    render(<AnimalCard animal={makeNgoAnimal()} href={HREF} />);

    expect(screen.getByRole('heading', { name: 'Mel' })).toBeInTheDocument();
    expect(screen.getByText('Gato · Cerca de 2 anos')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', HREF);
  });

  it('NGO-07: disponível não tem selo', () => {
    render(<AnimalCard animal={makeNgoAnimal()} href={HREF} />);

    expect(screen.queryByText('Indisponível')).not.toBeInTheDocument();
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
