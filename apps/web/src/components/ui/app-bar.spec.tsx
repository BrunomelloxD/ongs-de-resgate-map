import { render, screen } from '@testing-library/react';
import { AppBar } from './app-bar';

describe('AppBar', () => {
  it('← e o título como h1; o link guarda o rótulo e mostra o texto só no desktop', () => {
    const { container } = render(
      <AppBar
        title="Perfil da ONG"
        back={{ href: '/painel', label: 'Voltar para o painel' }}
      />,
    );
    const link = screen.getByRole('link', { name: 'Voltar para o painel' });

    expect(link).toHaveAttribute('href', '/painel');
    expect(link.className).toContain('touch-target');
    expect(screen.getByText('Voltar para o painel')).toHaveClass(
      'sr-only',
      'lg:not-sr-only',
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Perfil da ONG' }),
    ).toHaveClass('text-lg', 'lg:text-4xl');
    expect(container.querySelectorAll('svg')).toHaveLength(1);
  });

  it('close desenha ✕ no celular e ← no desktop', () => {
    const { container } = render(
      <AppBar
        title="Cadastrar animal"
        back={{ href: '/painel', label: 'Voltar para seus animais' }}
        icon="close"
      />,
    );
    const [x, arrow] = container.querySelectorAll('svg');

    expect(x).toHaveClass('lucide-x', 'lg:hidden');
    expect(arrow).toHaveClass('hidden', 'lg:block');
  });

  it('titleAs p: o título só aparece no celular; phoneOnly esconde a barra no desktop', () => {
    const { container } = render(
      <AppBar
        title="Localização"
        titleAs="p"
        back={{ href: '/', label: 'Voltar para a página inicial' }}
        phoneOnly
        className="extra"
      />,
    );

    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.getByText('Localização')).toHaveClass('lg:hidden');
    expect(container.firstElementChild!.className).toContain('lg:hidden');
    expect(container.firstElementChild!.className).toContain('extra');
  });
});
