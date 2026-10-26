import { fireEvent, render, screen } from '@testing-library/react';
import { LiveRegion } from './live-region.client';
import { ShareButton } from './share-button.client';
import { SHARE_TEXT } from './ui.dictionary';

const PROPS = {
  title: 'Patas do Bairro',
  text: 'Resgatamos cães e gatos na Zona Sul.',
  url: 'https://animalhelper.example/ong/patas-do-bairro',
};

// The live region repeats the text for screen readers.
const VISIBLE = { ignore: '[role=status] *' };

function stubNavigator(name: 'share' | 'clipboard', value: unknown) {
  Object.defineProperty(navigator, name, { value, configurable: true });
}

function renderButton() {
  render(
    <LiveRegion>
      <ShareButton {...PROPS} />
    </LiveRegion>,
  );
  // fireEvent: user-event would install its own clipboard.
  fireEvent.click(screen.getByRole('button', { name: 'Compartilhar' }));
}

describe('ShareButton', () => {
  afterEach(() => {
    stubNavigator('share', undefined);
    stubNavigator('clipboard', undefined);
  });

  it('SHARE-01: com navigator.share, compartilha título, texto e URL da página', async () => {
    const share = vi.fn(async () => undefined);
    const writeText = vi.fn(async () => undefined);
    stubNavigator('share', share);
    stubNavigator('clipboard', { writeText });

    renderButton();

    await vi.waitFor(() =>
      expect(share).toHaveBeenCalledWith({
        title: 'Patas do Bairro',
        text: 'Resgatamos cães e gatos na Zona Sul.',
        url: 'https://animalhelper.example/ong/patas-do-bairro',
      }),
    );
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.queryByText('Link copiado.')).not.toBeInTheDocument();
  });

  it('SHARE-01: fechar a folha de compartilhamento não copia nada', async () => {
    const share = vi.fn(async () => {
      throw new DOMException('cancelado', 'AbortError');
    });
    const writeText = vi.fn(async () => undefined);
    stubNavigator('share', share);
    stubNavigator('clipboard', { writeText });

    renderButton();

    await vi.waitFor(() => expect(share).toHaveBeenCalled());
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('SHARE-02: sem navigator.share, copia a URL e mostra "Link copiado." (também na região polite)', async () => {
    const writeText = vi.fn(async () => undefined);
    stubNavigator('clipboard', { writeText });

    renderButton();

    expect(await screen.findByText('Link copiado.', VISIBLE)).toBeVisible();
    expect(writeText).toHaveBeenCalledWith(
      'https://animalhelper.example/ong/patas-do-bairro',
    );
    expect(screen.getByRole('status')).toHaveTextContent('Link copiado.');
  });

  it('SHARE-02: se o navigator.share falhar por outro motivo, copia a URL', async () => {
    stubNavigator(
      'share',
      vi.fn(async () => {
        throw new DOMException('negado', 'NotAllowedError');
      }),
    );
    const writeText = vi.fn(async () => undefined);
    stubNavigator('clipboard', { writeText });

    renderButton();

    expect(await screen.findByText('Link copiado.', VISIBLE)).toBeVisible();
    expect(writeText).toHaveBeenCalledWith(PROPS.url);
  });

  it('SHARE-03: se a cópia falhar, mostra a URL num campo selecionável, já focado', async () => {
    stubNavigator('clipboard', {
      writeText: vi.fn(async () => {
        throw new DOMException('negado', 'NotAllowedError');
      }),
    });

    renderButton();

    const field = await screen.findByRole<HTMLInputElement>('textbox', {
      name: SHARE_TEXT.field,
    });
    expect(field).toHaveValue(
      'https://animalhelper.example/ong/patas-do-bairro',
    );
    expect(field).toHaveAttribute('readonly');
    await vi.waitFor(() => expect(field).toHaveFocus());
    expect(field.selectionStart).toBe(0);
    expect(field.selectionEnd).toBe(PROPS.url.length);
    expect(screen.queryByText('Link copiado.')).not.toBeInTheDocument();
  });

  it('SHARE-03: sem a API de área de transferência, também mostra o campo', async () => {
    renderButton();

    expect(
      await screen.findByRole('textbox', { name: SHARE_TEXT.field }),
    ).toHaveValue(PROPS.url);
  });
});

describe('ShareButton redondo (C-25)', () => {
  function renderIcon() {
    render(
      <LiveRegion>
        <ShareButton {...PROPS} variant="icon" />
      </LiveRegion>,
    );
    return screen.getByRole('button', { name: 'Compartilhar' });
  }

  it('só o ícone, com o nome "Compartilhar"; "Link copiado." flutua abaixo', async () => {
    stubNavigator('share', undefined);
    stubNavigator('clipboard', { writeText: vi.fn(async () => {}) });
    const button = renderIcon();

    expect(button).toHaveTextContent('');
    expect(button).toHaveClass('shadow-card');
    fireEvent.click(button);

    expect(await screen.findByText(SHARE_TEXT.copied, VISIBLE)).toHaveClass(
      'absolute',
    );
  });

  it('sem área de transferência, o campo com a URL flutua abaixo', async () => {
    stubNavigator('share', undefined);
    stubNavigator('clipboard', {
      writeText: vi.fn(async () => {
        throw new Error('denied');
      }),
    });
    fireEvent.click(renderIcon());

    const field = await screen.findByRole('textbox', {
      name: SHARE_TEXT.field,
    });
    expect(field.closest('div.absolute')).not.toBeNull();
  });
});
