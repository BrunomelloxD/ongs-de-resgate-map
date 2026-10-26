import { render } from '@testing-library/react';
import { WhatsAppIcon } from './whatsapp-icon';

describe('WhatsAppIcon', () => {
  it('C-24: é o logo do WhatsApp na cor do texto e fica fora do leitor de tela', () => {
    const { container } = render(<WhatsAppIcon className="size-6" />);
    const svg = container.querySelector('[data-slot="whatsapp-icon"]')!;

    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveClass('size-6');
    expect(svg.querySelector('path')).toHaveAttribute('fill', 'currentColor');
  });
});
