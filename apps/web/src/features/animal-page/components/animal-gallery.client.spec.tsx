import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeImages } from '../test-fixtures';
import { AnimalGallery } from './animal-gallery.client';

const IMAGES = makeImages(3);

function mainImage() {
  return screen.getAllByRole('img', { name: 'Caramelo, cão, porte médio' })[0]!;
}

describe('AnimalGallery', () => {
  it('ANI-01/ANI-02: começa em "1/3" com a capa, com width e height', () => {
    render(<AnimalGallery images={IMAGES} name="Caramelo" />);

    expect(screen.getByText('1/3')).toBeInTheDocument();
    expect(mainImage()).toHaveAttribute('src', IMAGES[0]!.url);
    expect(mainImage()).toHaveAttribute('width', '1200');
    expect(mainImage()).toHaveAttribute('height', '900');
  });

  it('PERF-02/T175: a foto principal é sempre a de 1200 px, sem srcset', () => {
    render(<AnimalGallery images={IMAGES} name="Caramelo" />);

    expect(mainImage().getAttribute('src')).toMatch(/-1200\.webp$/);
    expect(mainImage()).not.toHaveAttribute('srcset');
  });

  it('ANI-01: miniaturas de 160 px, lazy, com a atual marcada', () => {
    render(<AnimalGallery images={IMAGES} name="Caramelo" />);
    const thumbs = screen.getAllByRole('button');

    expect(thumbs).toHaveLength(3);
    expect(thumbs[0]).toHaveAttribute('aria-current', 'true');
    const img = thumbs[1]!.querySelector('img');
    expect(img).toHaveAttribute('src', IMAGES[1]!.thumbUrl);
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('clicar na 3ª miniatura mostra "3/3" e a 3ª foto', async () => {
    render(<AnimalGallery images={IMAGES} name="Caramelo" />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Ver foto 3 de 3' }),
    );

    expect(screen.getByText('3/3')).toBeInTheDocument();
    expect(mainImage()).toHaveAttribute('src', IMAGES[2]!.url);
    expect(
      screen.getByRole('button', { name: 'Ver foto 3 de 3' }),
    ).toHaveAttribute('aria-current', 'true');
  });

  it('setas navegam, movem o foco e param nas pontas', async () => {
    const user = userEvent.setup();
    render(<AnimalGallery images={IMAGES} name="Caramelo" />);
    const [first, second, third] = screen.getAllByRole('button');

    await user.click(first!);
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText('1/3')).toBeInTheDocument();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(second).toHaveFocus();

    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(screen.getByText('3/3')).toBeInTheDocument();
    expect(third).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText('2/3')).toBeInTheDocument();

    await user.keyboard('a');
    expect(screen.getByText('2/3')).toBeInTheDocument();
  });

  it('uma foto só: "1/1" e sem miniaturas', () => {
    render(<AnimalGallery images={makeImages(1)} name="Caramelo" />);

    expect(screen.getByText('1/1')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('sem fotos: placeholder e sem contador', () => {
    const { container } = render(<AnimalGallery images={[]} name="Caramelo" />);

    expect(
      container.querySelector('[data-slot="animal-gallery-placeholder"]'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/\/\d/)).not.toBeInTheDocument();
  });
});
