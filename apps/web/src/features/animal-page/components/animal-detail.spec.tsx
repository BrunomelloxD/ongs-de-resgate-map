import { render, screen, within } from '@testing-library/react';
import { makeAnimal } from '../test-fixtures';
import { AnimalDetail } from './animal-detail';

const MEL_URL = `https://wa.me/5511987654321?text=${encodeURIComponent('Olá! Vi a Mel no Animal Helper e quero saber como adotar.')}`;

function unavailable() {
  return makeAnimal({ available: false, whatsappUrl: null });
}

describe('AnimalDetail', () => {
  it('ANI-01: nome, selo, espécie, raça, sexo, porte, idade, descrição e galeria', () => {
    render(<AnimalDetail animal={makeAnimal()} />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Caramelo' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Disponível')).toBeInTheDocument();
    const values = screen
      .getAllByRole('definition')
      .map((dd) => dd.textContent);
    expect(values).toEqual([
      'Cão',
      'SRD (vira-lata)',
      'Macho',
      'Médio',
      'Cerca de 3 anos',
    ]);
    expect(
      screen.getByText('Brincalhão, se dá bem com crianças e outros cães.'),
    ).toBeInTheDocument();
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('ANI-03/04: macho → "Quero adotar o Caramelo" com o whatsappUrl', () => {
    const animal = makeAnimal();
    render(<AnimalDetail animal={animal} />);

    expect(
      screen.getByRole('link', { name: 'Quero adotar o Caramelo' }),
    ).toHaveAttribute('href', animal.whatsappUrl);
  });

  it('ANI-03/04: fêmea → "Quero adotar a Mel" com o whatsappUrl', () => {
    render(
      <AnimalDetail
        animal={makeAnimal({
          name: 'Mel',
          sex: 'FEMALE',
          whatsappUrl: MEL_URL,
        })}
      />,
    );

    expect(
      screen.getByRole('link', { name: 'Quero adotar a Mel' }),
    ).toHaveAttribute('href', MEL_URL);
  });

  it('ANI-05: indisponível → botão desabilitado, texto e link para a ONG', () => {
    render(<AnimalDetail animal={unavailable()} />);

    expect(
      screen.getByRole('button', { name: 'Quero adotar o Caramelo' }),
    ).toBeDisabled();
    expect(
      screen.queryByRole('link', { name: 'Quero adotar o Caramelo' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('Caramelo não está disponível para adoção no momento.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: 'Ver outros animais da Patas do Bairro',
      }),
    ).toHaveAttribute('href', '/ong/patas-do-bairro');
    expect(screen.getByText('Indisponível')).toBeInTheDocument();
  });

  it('ANI-01: card da ONG com nome, cidade e link', () => {
    render(<AnimalDetail animal={makeAnimal()} />);
    const card = document.querySelector<HTMLElement>(
      '[data-slot="animal-ngo-card"]',
    )!;

    expect(
      within(card).getByRole('heading', { name: 'Patas do Bairro' }),
    ).toBeInTheDocument();
    expect(within(card).getByText('São Paulo – SP')).toBeInTheDocument();
    expect(
      within(card).getByRole('link', { name: 'Ver página da ONG' }),
    ).toHaveAttribute('href', '/ong/patas-do-bairro');
    expect(card.querySelector('img')).toHaveAttribute(
      'src',
      makeAnimal().ngo.imageUrl,
    );
  });

  it('sem raça, sem descrição e ONG sem imagem', () => {
    const animal = makeAnimal({ breed: null, description: null });
    render(
      <AnimalDetail
        animal={{ ...animal, ngo: { ...animal.ngo, imageUrl: null } }}
      />,
    );

    expect(screen.queryByText('Raça')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Sobre Caramelo' }),
    ).toBeNull();
    expect(
      document.querySelector('[data-slot="ngo-thumb-placeholder"]'),
    ).toBeInTheDocument();
  });
});
