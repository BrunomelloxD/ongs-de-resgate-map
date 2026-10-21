import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LiveRegion, useAnnounce } from './live-region.client';

function Announcer({ message }: { message: string }) {
  const announce = useAnnounce();

  return <button onClick={() => announce(message)}>Anunciar</button>;
}

function renderWithRegion(message = 'Mel agora está indisponível.') {
  return render(
    <LiveRegion>
      <Announcer message={message} />
    </LiveRegion>,
  );
}

describe('LiveRegion', () => {
  it('renderiza uma região polite, vazia no início, e os filhos', () => {
    renderWithRegion();

    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveAttribute('aria-atomic', 'true');
    expect(region).toBeEmptyDOMElement();
    expect(screen.getByRole('button', { name: 'Anunciar' })).toBeVisible();
  });

  it("announce('Mel agora está indisponível.') aparece na região polite", async () => {
    renderWithRegion();

    await userEvent.click(screen.getByRole('button', { name: 'Anunciar' }));

    expect(screen.getByRole('status')).toHaveTextContent(
      'Mel agora está indisponível.',
    );
  });

  it('o mesmo texto anunciado duas vezes cria um nó novo, lido de novo', async () => {
    renderWithRegion();
    const button = screen.getByRole('button', { name: 'Anunciar' });

    await userEvent.click(button);
    const first = screen.getByText('Mel agora está indisponível.');
    await userEvent.click(button);
    const second = screen.getByText('Mel agora está indisponível.');

    expect(second).not.toBe(first);
    expect(first).not.toBeInTheDocument();
    expect(screen.getByRole('status').children).toHaveLength(1);
  });

  it('um texto novo substitui o anterior', async () => {
    function Two() {
      const announce = useAnnounce();

      return (
        <>
          <button onClick={() => announce('Primeiro')}>a</button>
          <button onClick={() => announce('Segundo')}>b</button>
        </>
      );
    }
    render(
      <LiveRegion>
        <Two />
      </LiveRegion>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'a' }));
    await userEvent.click(screen.getByRole('button', { name: 'b' }));

    expect(screen.getByRole('status')).toHaveTextContent(/^Segundo$/);
  });

  it('a região é só para leitores de tela', () => {
    renderWithRegion();

    expect(screen.getByRole('status').className).toContain('sr-only');
  });

  it('useAnnounce fora do LiveRegion falha com mensagem clara', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<Announcer message="x" />)).toThrow(
      'useAnnounce precisa estar dentro de <LiveRegion>.',
    );
    spy.mockRestore();
  });

  it('announce é estável entre renders (seguro em dependências de efeitos)', () => {
    const seen: unknown[] = [];
    function Probe() {
      seen.push(useAnnounce());
      return null;
    }
    const { rerender } = render(
      <LiveRegion>
        <Probe />
      </LiveRegion>,
    );

    act(() =>
      rerender(
        <LiveRegion>
          <Probe />
        </LiveRegion>,
      ),
    );

    expect(new Set(seen).size).toBe(1);
  });
});
