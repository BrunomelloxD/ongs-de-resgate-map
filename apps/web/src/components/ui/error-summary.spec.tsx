import { render, screen, within } from '@testing-library/react';
import { ErrorSummary, FieldError, focusFirstError } from './error-summary';
import { Input } from './input';
import { Label } from './label';

const ERRORS = [
  { fieldId: 'email', message: 'Informe um e-mail válido, como nome@ong.org.' },
  { fieldId: 'cnpj', message: 'O CNPJ tem 14 caracteres.' },
];

function Form({ withErrors = true }: { withErrors?: boolean }) {
  return (
    <form aria-label="Cadastro">
      <ErrorSummary
        title="Corrija 2 erros para continuar"
        errors={withErrors ? ERRORS : []}
      />
      <Label htmlFor="name">Nome</Label>
      <Input id="name" />
      <Label htmlFor="email">E-mail</Label>
      <Input
        id="email"
        aria-invalid={withErrors}
        aria-describedby={withErrors ? 'email-error' : undefined}
      />
      {withErrors && (
        <FieldError id="email-error">{ERRORS[0]!.message}</FieldError>
      )}
      <Label htmlFor="cnpj">CNPJ</Label>
      <Input id="cnpj" aria-invalid={withErrors} />
    </form>
  );
}

describe('ErrorSummary', () => {
  it('com 2 erros, lista os 2 com link para o campo', () => {
    render(<Form />);

    const summary = screen.getByRole('region', {
      name: 'Corrija 2 erros para continuar',
    });
    const links = within(summary).getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveTextContent(ERRORS[0]!.message);
    expect(links[0]).toHaveAttribute('href', '#email');
    expect(links[1]).toHaveAttribute('href', '#cnpj');
  });

  it('sem erros, não renderiza nada', () => {
    render(<Form withErrors={false} />);

    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('pode receber foco programático (tabIndex -1)', () => {
    render(<Form />);
    const summary = screen.getByRole('region');

    summary.focus();

    expect(summary).toHaveFocus();
  });
});

describe('focusFirstError', () => {
  it('move o foco para o primeiro campo com erro na ordem do DOM', () => {
    render(<Form />);

    const target = focusFirstError(screen.getByRole('form'));

    expect(screen.getByLabelText('E-mail')).toHaveFocus();
    expect(target).toBe(screen.getByLabelText('E-mail'));
  });

  it('sem campo inválido, foca o resumo, se houver', () => {
    render(
      <form aria-label="Cadastro">
        <ErrorSummary title="Erros" errors={[{ fieldId: 'x', message: 'm' }]} />
      </form>,
    );

    focusFirstError(screen.getByRole('form'));

    expect(screen.getByRole('region')).toHaveFocus();
  });

  it('sem erro nenhum, não foca nada e devolve null', () => {
    render(<Form withErrors={false} />);

    expect(focusFirstError(screen.getByRole('form'))).toBeNull();
    expect(document.body).toHaveFocus();
  });
});

describe('FieldError', () => {
  it('liga o texto ao campo por aria-describedby, com ícone decorativo', () => {
    const { container } = render(<Form />);

    expect(screen.getByLabelText('E-mail')).toHaveAccessibleDescription(
      ERRORS[0]!.message,
    );
    expect(container.querySelector('#email-error svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('mostra o como corrigir junto da mensagem e aceita classes extras', () => {
    render(
      <FieldError id="f" className="extra">
        CNPJ inválido. Confira os 14 caracteres.
      </FieldError>,
    );

    const error = screen.getByText('CNPJ inválido. Confira os 14 caracteres.');
    expect(error.closest('#f')!.className).toContain('extra');
  });
});
