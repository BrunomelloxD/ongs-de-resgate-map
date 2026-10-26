import { fireEvent, render, screen, within } from '@testing-library/react';
import { LiveRegion } from '@/components/ui/live-region.client';
import { makeAnimal } from '../test-fixtures';
import { AnimalDetail } from './animal-detail';

const MEL_URL = `https://wa.me/5511987654321?text=${encodeURIComponent('Olá! Vi a Mel no Animal Helper e quero saber como adotar.')}`;

function unavailable() {
  return makeAnimal({ available: false, whatsappUrl: null });
}

describe('AnimalDetail', () => {
  describe('SHARE-01: Compartilhar', () => {
    afterEach(() => {
      Object.defineProperty(navigator, 'share', {
        value: undefined,
        configurable: true,
      });
    });

    it('passa ao navigator.share o título, o texto e a URL canônica do animal', async () => {
      const share = vi.fn(async () => undefined);
      Object.defineProperty(navigator, 'share', {
        value: share,
        configurable: true,
      });
      render(
        <LiveRegion>
          <AnimalDetail
            animal={makeAnimal()}
            share={{
              title: 'Caramelo · Patas do Bairro',
              text: 'Caramelo é calmo.',
              url: 'https://animalhelper.example/ong/patas-do-bairro/animais/1',
            }}
          />
        </LiveRegion>,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Compartilhar' }));

      await vi.waitFor(() =>
        expect(share).toHaveBeenCalledWith({
          title: 'Caramelo · Patas do Bairro',
          text: 'Caramelo é calmo.',
          url: 'https://animalhelper.example/ong/patas-do-bairro/animais/1',
        }),
      );
    });

    it('sem os dados do compartilhamento, sem o botão', () => {
      render(<AnimalDetail animal={makeAnimal()} />);

      expect(
        screen.queryByRole('button', { name: 'Compartilhar' }),
      ).not.toBeInTheDocument();
    });
  });
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

  it('T183: "Quero adotar" vai na barra de ações com o texto de apoio do figcraft', () => {
    const { container } = render(<AnimalDetail animal={makeAnimal()} />);
    const bar = container.querySelector('[data-slot="action-bar"]')!;

    expect(bar).toContainElement(
      screen.getByRole('link', { name: 'Quero adotar o Caramelo' }),
    );
    expect(bar).toHaveTextContent(
      'Abre o WhatsApp da ONG com uma mensagem pronta sobre o Caramelo.',
    );
  });

  it('T183/C-06: indisponível, o texto do ANI-05 fica num Alert/Info e o botão na barra', () => {
    const { container } = render(<AnimalDetail animal={unavailable()} />);
    const alert = container.querySelector('[data-slot="alert"]')!;

    expect(alert).toHaveAttribute('data-variant', 'info');
    expect(alert).toHaveTextContent(
      'Caramelo não está disponível para adoção no momento.',
    );
    expect(
      container.querySelector('[data-slot="action-bar"] button'),
    ).toBeDisabled();
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
