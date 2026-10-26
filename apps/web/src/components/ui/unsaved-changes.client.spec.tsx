import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Activity } from 'react';
import { GuardedLink, UnsavedChangesProvider } from './unsaved-changes.client';
import { UNSAVED_CHANGES_TEXT } from './ui.dictionary';

const navigate = vi.hoisted(() => vi.fn());

// jsdom has no App Router: this double keeps the next/link contract (a click
// already prevented by onClick doesn't navigate).
vi.mock('next/link', () => ({
  default: ({
    href,
    onClick,
    ref,
    children,
    ...rest
  }: {
    href: string;
    onClick?: React.MouseEventHandler<HTMLAnchorElement>;
    ref?: React.Ref<HTMLAnchorElement>;
    children: React.ReactNode;
  }) => (
    <a
      {...rest}
      href={href}
      ref={ref}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        navigate(href);
      }}
    >
      {children}
    </a>
  ),
}));

function screenWith(dirty: boolean, mode: 'visible' | 'hidden' = 'visible') {
  return (
    <>
      <Activity mode={mode}>
        <UnsavedChangesProvider dirty={dirty}>
          <input aria-label="Nome" />
        </UnsavedChangesProvider>
      </Activity>
      <GuardedLink href="/painel">Voltar para o painel</GuardedLink>
    </>
  );
}

/** Whether closing or reloading the tab now would ask first (DIRTY-02). */
function beforeUnloadPrevented() {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

const link = () => screen.getByRole('link', { name: 'Voltar para o painel' });

describe('UnsavedChangesProvider + GuardedLink', () => {
  beforeEach(() => navigate.mockClear());

  it('DIRTY-01: com alterações, o link abre "Sair sem salvar?" com "Continuar editando" e "Sair", sem navegar', async () => {
    render(screenWith(true));

    await userEvent.click(link());

    const dialog = await screen.findByRole('dialog', {
      name: 'Sair sem salvar?',
    });
    expect(dialog).toHaveTextContent(UNSAVED_CHANGES_TEXT.description);
    expect(
      screen.getByRole('button', { name: 'Continuar editando' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeVisible();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('DIRTY-01: "Continuar editando" fecha o diálogo e fica na página', async () => {
    render(screenWith(true));

    await userEvent.click(link());
    await userEvent.click(
      await screen.findByRole('button', { name: 'Continuar editando' }),
    );

    await vi.waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('DIRTY-01: "Sair" fecha o diálogo e navega para o destino do link', async () => {
    render(screenWith(true));

    await userEvent.click(link());
    await userEvent.click(await screen.findByRole('button', { name: 'Sair' }));

    expect(navigate).toHaveBeenCalledExactlyOnceWith('/painel');
    await vi.waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('DIRTY-01: com alterações, abrir em outra aba (Ctrl+clique) não pergunta', async () => {
    render(screenWith(true));

    fireEvent.click(link(), { ctrlKey: true });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('DIRTY-01: com alterações, um link para outra aba (target="_blank") não pergunta', async () => {
    render(
      <>
        <UnsavedChangesProvider dirty />
        <GuardedLink href="/termos" target="_blank">
          Termos
        </GuardedLink>
      </>,
    );

    await userEvent.click(screen.getByRole('link', { name: 'Termos' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('DIRTY-03: sem alterações, navega direto, sem diálogo', async () => {
    render(screenWith(false));

    await userEvent.click(link());

    expect(navigate).toHaveBeenCalledExactlyOnceWith('/painel');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('DIRTY-02: sujo registra o beforeunload; limpo ou desmontado, remove', () => {
    const { rerender, unmount } = render(screenWith(true));
    expect(beforeUnloadPrevented()).toBe(true);

    rerender(screenWith(false));
    expect(beforeUnloadPrevented()).toBe(false);

    rerender(screenWith(true));
    expect(beforeUnloadPrevented()).toBe(true);
    unmount();
    expect(beforeUnloadPrevented()).toBe(false);
  });

  it('DIRTY-02: com dois formulários sujos, limpar um mantém o aviso', () => {
    const { rerender } = render(
      <>
        <UnsavedChangesProvider dirty />
        <UnsavedChangesProvider dirty />
      </>,
    );

    rerender(
      <>
        <UnsavedChangesProvider dirty />
        <UnsavedChangesProvider dirty={false} />
      </>,
    );

    expect(beforeUnloadPrevented()).toBe(true);
  });

  it('<Activity>: um formulário sujo escondido não avisa nem segura os links', async () => {
    const { rerender } = render(screenWith(true));
    expect(beforeUnloadPrevented()).toBe(true);

    rerender(screenWith(true, 'hidden'));
    expect(beforeUnloadPrevented()).toBe(false);
    await userEvent.click(link());

    expect(navigate).toHaveBeenCalledExactlyOnceWith('/painel');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
