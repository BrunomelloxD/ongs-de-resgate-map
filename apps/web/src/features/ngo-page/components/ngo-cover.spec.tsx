import { fireEvent, render, screen } from '@testing-library/react';
import { LiveRegion } from '@/components/ui/live-region.client';
import { makeNgo } from '../test-fixtures';
import { NgoCover } from './ngo-cover';

describe('NgoCover', () => {
  // Moved from ngo-profile.spec.tsx (T189, C-25): "Compartilhar" floats on the cover now.
  describe('SHARE-01: Compartilhar', () => {
    afterEach(() => {
      Object.defineProperty(navigator, 'share', {
        value: undefined,
        configurable: true,
      });
    });

    it('passa ao navigator.share o título, o texto e a URL canônica da ONG', async () => {
      const share = vi.fn(async () => undefined);
      Object.defineProperty(navigator, 'share', {
        value: share,
        configurable: true,
      });
      const ngo = makeNgo();
      render(
        <LiveRegion>
          <NgoCover
            ngo={ngo}
            backHref="/"
            share={{
              title: 'Patas do Bairro',
              text: ngo.description,
              url: 'https://animalhelper.example/ong/patas-do-bairro',
            }}
          />
        </LiveRegion>,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Compartilhar' }));

      await vi.waitFor(() =>
        expect(share).toHaveBeenCalledWith({
          title: 'Patas do Bairro',
          text: ngo.description,
          url: 'https://animalhelper.example/ong/patas-do-bairro',
        }),
      );
    });

    it('sem os dados do compartilhamento, sem o botão', () => {
      render(<NgoCover ngo={makeNgo()} backHref="/" />);

      expect(
        screen.queryByRole('button', { name: 'Compartilhar' }),
      ).not.toBeInTheDocument();
    });
  });

  it('O-01/PERF-02: a foto da ONG em largura total, com width, height e prioridade alta', () => {
    const ngo = makeNgo();
    const { container } = render(<NgoCover ngo={ngo} backHref="/" />);
    const img = container.querySelector('img')!;

    expect(container.firstElementChild).toHaveClass('h-[220px]', 'lg:h-80');
    expect(img).toHaveAttribute('src', ngo.imageUrl);
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('width', '600');
    expect(img).toHaveAttribute('fetchpriority', 'high');
    expect(img).not.toHaveAttribute('loading');
  });

  it('sem imagem, o fundo com a pata', () => {
    const { container } = render(
      <NgoCover ngo={makeNgo({ imageUrl: null })} backHref="/" />,
    );

    expect(container.querySelector('img')).toBeNull();
    expect(
      container.querySelector('[data-slot="ngo-cover-placeholder"]'),
    ).toHaveAttribute('aria-hidden', 'true');
  });

  it('C-25: ← flutua na capa só no celular', () => {
    render(<NgoCover ngo={makeNgo()} backHref="/mapa" />);

    const back = screen.getByRole('link', { name: 'Voltar' });
    expect(back).toHaveAttribute('href', '/mapa');
    expect(back).toHaveClass('lg:hidden');
  });
});
