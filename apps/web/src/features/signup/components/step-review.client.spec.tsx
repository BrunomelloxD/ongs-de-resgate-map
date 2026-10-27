import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { ReviewValues, SignupData } from '../signup.types';
import { makeSignupData } from '../test-fixtures';
import { StepReview, type StepReviewProps } from './step-review.client';

const DEMO_TEXT =
  'Entendi que esta é uma demonstração e que a ONG, os animais e as fotos serão apagados em 7 dias.';
const TERMS = 'Li e aceito os Termos de uso e a Política de privacidade.';
const DEMO_ON = { enabled: true, retentionDays: 7 };
const DEMO_OFF = { enabled: false, retentionDays: 7 };

function renderStep(
  props: Partial<StepReviewProps> = {},
  review: Partial<ReviewValues> = {},
) {
  const onSubmit = vi.fn();
  const onBack = vi.fn();
  const base = makeSignupData();

  function Harness() {
    const [data, setData] = useState<SignupData>({
      ...base,
      review: { ...base.review, ...review },
    });
    return (
      <StepReview
        data={data}
        image={null}
        demo={DEMO_ON}
        onChange={(patch) =>
          setData((d) => ({ ...d, review: { ...d.review, ...patch } }))
        }
        onSubmit={onSubmit}
        onBack={onBack}
        {...props}
      />
    );
  }

  render(<Harness />);
  return { onSubmit, onBack };
}

const createButton = () => screen.getByRole('button', { name: 'Criar conta' });
const section = (name: string) =>
  screen.getByRole('heading', { level: 2, name }).closest('section')!;

describe('StepReview', () => {
  it('SIGN-26: mostra o resumo de cada etapa', () => {
    renderStep();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Revisão' }),
    ).toBeVisible();
    const about = within(section('Sobre a ONG'));
    expect(about.getByText('11.222.333/0001-81')).toBeVisible();
    expect(
      about.getByText('Associação Protetora Patas do Bairro'),
    ).toBeVisible();
    const contact = within(section('Contato e acesso'));
    expect(contact.getByText('contato@patasdobairro.org')).toBeVisible();
    expect(contact.getByText('(11) 98765-4321')).toBeVisible();
    expect(
      within(section('Endereço')).getByText(
        'Rua Joaquim Távora, 1240 · Vila Mariana, São Paulo – SP · 04015-012',
      ),
    ).toBeVisible();
    const hours = within(section('Horário'));
    expect(hours.getAllByRole('term').map((dt) => dt.textContent)).toEqual([
      'Segunda',
      'Terça',
      'Quarta',
      'Quinta',
      'Sexta',
      'Sábado',
      'Domingo',
    ]);
    expect(
      hours.getAllByRole('definition').map((dd) => dd.textContent),
    ).toEqual([
      '09:00 às 18:00',
      '09:00 às 18:00',
      '09:00 às 18:00',
      '09:00 às 18:00',
      '09:00 às 18:00',
      '09:00 às 13:00',
      'Fechada',
    ]);
  });

  it('mostra o complemento quando há', () => {
    const data = makeSignupData();
    data.address.complement = 'Sala 2';
    renderStep({ data });

    expect(
      screen.getByText(
        'Rua Joaquim Távora, 1240 – Sala 2 · Vila Mariana, São Paulo – SP · 04015-012',
      ),
    ).toBeVisible();
  });

  it('SIGN-26: cada "Editar" leva à etapa; o de Endereço leva à etapa 3', () => {
    renderStep();

    expect(
      screen.getByRole('link', { name: 'Editar Endereço' }),
    ).toHaveAttribute('href', '/cadastro/endereco');
    expect(
      screen.getByRole('link', { name: 'Editar Sobre a ONG' }),
    ).toHaveAttribute('href', '/cadastro/sobre');
    expect(
      screen.getByRole('link', { name: 'Editar Contato e acesso' }),
    ).toHaveAttribute('href', '/cadastro/contato');
    expect(
      screen.getByRole('link', { name: 'Editar Horário' }),
    ).toHaveAttribute('href', '/cadastro/horario');
  });

  it('SIGN-27: os links dos Termos e da Política abrem as páginas', () => {
    renderStep();

    expect(screen.getByRole('link', { name: 'Termos de uso' })).toHaveAttribute(
      'href',
      '/termos',
    );
    expect(
      screen.getByRole('link', { name: 'Política de privacidade' }),
    ).toHaveAttribute('href', '/privacidade');
  });

  it('SIGN-27/DEMO-03: sem os aceites, "Criar conta" fica desabilitado', async () => {
    const { onSubmit } = renderStep();

    expect(createButton()).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: TERMS }));
    expect(createButton()).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: DEMO_TEXT }));
    expect(createButton()).toBeEnabled();

    await userEvent.click(createButton());
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('DEMO-03: texto exato do aceite da demo, com N = DEMO_RETENTION_DAYS', () => {
    renderStep({ demo: { enabled: true, retentionDays: 3 } });

    expect(
      screen.getByRole('checkbox', {
        name: 'Entendi que esta é uma demonstração e que a ONG, os animais e as fotos serão apagados em 3 dias.',
      }),
    ).toBeInTheDocument();
  });

  it('DEMO-20: demo desligada → sem a caixa da demo, e só os Termos liberam "Criar conta"', async () => {
    renderStep({ demo: DEMO_OFF });

    expect(screen.queryByText(DEMO_TEXT)).not.toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    await userEvent.click(screen.getByRole('checkbox', { name: TERMS }));
    expect(createButton()).toBeEnabled();
  });

  it('desmarcar os Termos bloqueia de novo', async () => {
    renderStep({}, { termsAccepted: true, demoAccepted: true });
    expect(createButton()).toBeEnabled();

    await userEvent.click(screen.getByRole('checkbox', { name: TERMS }));

    expect(createButton()).toBeDisabled();
  });

  it('enquanto cria a conta, o botão mostra "Criando a conta…" desabilitado', () => {
    renderStep({ pending: true }, { termsAccepted: true, demoAccepted: true });

    expect(
      screen.getByRole('button', { name: 'Criando a conta…' }),
    ).toBeDisabled();
  });

  it('DEMO-07/08: mostra o erro do envio num alerta', () => {
    renderStep({
      formError:
        'A demo atingiu o limite de ONGs. Tente de novo depois da próxima limpeza.',
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'A demo atingiu o limite de ONGs. Tente de novo depois da próxima limpeza.',
    );
  });

  it('mostra a imagem guardada e "Voltar" chama onBack', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:ong');
    URL.revokeObjectURL = vi.fn();
    const { onBack } = renderStep({
      image: new File(['x'], 'logo.png', { type: 'image/png' }),
    });

    expect(
      await screen.findByRole('img', { name: 'Imagem da ONG' }),
    ).toHaveAttribute('src', 'blob:ong');
    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('o envio do formulário sem os aceites não chama onSubmit', async () => {
    const { onSubmit } = renderStep();

    screen
      .getByRole('checkbox', { name: TERMS })
      .closest('form')!
      .requestSubmit();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  describe('demo fechada (AD-008, DEP-19)', () => {
    const LOCKED = { ...DEMO_ON, locked: true };

    it('com os aceites marcados, "Criar conta" continua desabilitado', () => {
      renderStep({ demo: LOCKED }, { termsAccepted: true, demoAccepted: true });

      expect(createButton()).toBeDisabled();
    });

    it('o envio do formulário não chama onSubmit', () => {
      const { onSubmit } = renderStep(
        { demo: LOCKED },
        { termsAccepted: true, demoAccepted: true },
      );

      screen
        .getByRole('checkbox', { name: TERMS })
        .closest('form')!
        .requestSubmit();

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
});
