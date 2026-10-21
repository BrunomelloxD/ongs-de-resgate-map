import { render, screen, within } from '@testing-library/react';
import { ngoPageDictionary as t } from '../ngo-page.dictionary';
import { makeNgo } from '../test-fixtures';
import { NgoProfile } from './ngo-profile';

describe('NgoProfile', () => {
  it('NGO-01: nome, selo "Aberta agora", descrição, endereço e mini mapa', () => {
    const ngo = makeNgo();
    render(<NgoProfile ngo={ngo} miniMap={<p>mini-mapa</p>} />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Patas do Bairro' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Aberta agora')).toBeInTheDocument();
    expect(screen.getByText(ngo.description)).toBeInTheDocument();
    expect(
      screen.getByText(
        'Rua Vergueiro, 3000 · Vila Mariana, São Paulo – SP · 04101-300',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('mini-mapa')).toBeInTheDocument();
  });

  it('NGO-01: ONG fechada mostra "Fechada" no selo', () => {
    render(<NgoProfile ngo={makeNgo({ openNow: false })} />);

    expect(
      document.querySelector('[data-slot="status-badge"]'),
    ).toHaveTextContent('Fechada');
  });

  it('NGO-03: o botão do WhatsApp leva ao whatsappUrl da api', () => {
    const ngo = makeNgo();
    render(<NgoProfile ngo={ngo} />);

    expect(
      screen.getByRole('link', { name: t.profile.whatsapp }),
    ).toHaveAttribute(
      'href',
      'https://wa.me/5511987654321?text=Ol%C3%A1!%20Vi%20a%20Patas%20do%20Bairro%20no%20Animal%20Helper.',
    );
  });

  it('NGO-04: "Como chegar" abre a rota do Google Maps numa nova aba', () => {
    render(<NgoProfile ngo={makeNgo()} />);
    const link = screen.getByRole('link', { name: /Como chegar/ });

    expect(link).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=-23.5869,-46.6347',
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('NGO-01: os 7 dias, com o dia todayIndex marcado como aria-current', () => {
    render(<NgoProfile ngo={makeNgo({ todayIndex: 3 })} />);
    const days = screen.getAllByRole('listitem');

    expect(days.map((day) => day.textContent)).toEqual([
      'Segunda09:00 às 18:00',
      'Terça09:00 às 18:00',
      'Quarta · hoje09:00 às 18:00',
      'Quinta09:00 às 18:00',
      'Sexta09:00 às 18:00',
      'Sábado09:00 às 13:00',
      'DomingoFechada',
    ]);
    expect(days[2]).toHaveAttribute('aria-current', 'date');
    expect(days.filter((day) => day.hasAttribute('aria-current'))).toHaveLength(
      1,
    );
  });

  it('PERF-02: imagem da ONG com width e height; sem imagem, o placeholder', () => {
    const { container, rerender } = render(<NgoProfile ngo={makeNgo()} />);
    const img = container.querySelector('img');

    expect(img).toHaveAttribute('src', makeNgo().imageUrl);
    expect(img).toHaveAttribute('width', '120');
    expect(img).toHaveAttribute('height', '120');

    rerender(<NgoProfile ngo={makeNgo({ imageUrl: null })} />);
    expect(container.querySelector('img')).toBeNull();
    expect(
      container.querySelector('[data-slot="ngo-image-placeholder"]'),
    ).toBeInTheDocument();
  });

  it('endereço com complemento e sem mini mapa', () => {
    const ngo = makeNgo();
    render(
      <NgoProfile
        ngo={{ ...ngo, address: { ...ngo.address, complement: 'Sala 2' } }}
      />,
    );

    expect(
      screen.getByText(
        'Rua Vergueiro, 3000, Sala 2 · Vila Mariana, São Paulo – SP · 04101-300',
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('list')).getAllByRole('listitem'),
    ).toHaveLength(7);
  });
});
