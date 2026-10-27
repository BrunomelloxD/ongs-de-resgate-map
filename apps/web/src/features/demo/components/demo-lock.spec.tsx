import { render, screen } from '@testing-library/react';
import { DemoLock, DemoLockedNotice } from './demo-lock';

function Form() {
  return (
    <form>
      <label htmlFor="email">E-mail</label>
      <input id="email" />
      <button type="submit">Enviar</button>
      <a href="/entrar">Voltar</a>
    </form>
  );
}

describe('DemoLock', () => {
  it('com a demo fechada mostra "Indisponível na demo." e desativa campos e botões (DEP-19, DEP-20)', () => {
    render(
      <DemoLock locked>
        <Form />
      </DemoLock>,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Indisponível na demo.',
    );
    expect(screen.getByLabelText('E-mail')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute(
      'href',
      '/entrar',
    );
  });

  it('com a demo aberta renderiza só o conteúdo, ativo (DEP-23)', () => {
    render(
      <DemoLock locked={false}>
        <Form />
      </DemoLock>,
    );

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeEnabled();
  });
});

describe('DemoLockedNotice', () => {
  it('explica que a tela pode ser vista, mas não enviada', () => {
    render(<DemoLockedNotice />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Nesta demonstração você pode ver esta tela, mas não enviar.',
    );
  });
});
