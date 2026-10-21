import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { AddressValues } from '../signup.types';
import { StepAddress, type AddressSlot } from './step-address.client';

const CONFIRMED = {
  lat: -23.5869,
  lng: -46.6347,
  confirmedAt: '2026-10-20T12:00:00.000Z',
};
const VALID: AddressValues = {
  cep: '04015-012',
  street: 'Rua Joaquim Távora',
  number: '1240',
  complement: '',
  district: 'Vila Mariana',
  city: 'São Paulo',
  uf: 'SP',
  location: CONFIRMED,
};
const NOT_CONFIRMED = 'Confirme a localização no mapa para continuar.';

function renderStep(values: Partial<AddressValues> = {}) {
  const onContinue = vi.fn();
  const onBack = vi.fn();
  const slots: AddressSlot[] = [];

  function Harness() {
    const [state, setState] = useState({ ...VALID, ...values });
    return (
      <StepAddress
        values={state}
        renderFields={(slot) => {
          slots.push(slot);
          return (
            <div>
              <label htmlFor={`${slot.idPrefix}-number`}>Número</label>
              <input
                id={`${slot.idPrefix}-number`}
                value={state.number}
                aria-invalid={slot.errors.number ? true : undefined}
                onChange={(e) =>
                  setState((s) => ({ ...s, number: e.target.value }))
                }
              />
              <button
                type="button"
                onClick={() => setState((s) => ({ ...s, location: CONFIRMED }))}
              >
                Confirmar localização
              </button>
              {Object.values(slot.errors).map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          );
        }}
        onContinue={onContinue}
        onBack={onBack}
      />
    );
  }

  render(<Harness />);
  return { onContinue, onBack, slots };
}

const submit = () =>
  userEvent.click(screen.getByRole('button', { name: 'Ir para Horário' }));
const summary = () =>
  screen.queryByRole('region', { name: 'Corrija para continuar' });

describe('StepAddress', () => {
  it('mostra o título e a explicação da etapa', () => {
    renderStep();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Endereço' }),
    ).toBeVisible();
    expect(
      screen.getByText('Usamos o endereço para colocar a ONG no mapa.'),
    ).toBeVisible();
  });

  it('SIGN-22: sem "Confirmar localização" o avanço fica bloqueado, com o erro no resumo e o foco nele', async () => {
    const { onContinue, slots } = renderStep({ location: null });

    await submit();

    expect(onContinue).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: NOT_CONFIRMED })).toHaveAttribute(
      'href',
      '#signup-address-location',
    );
    expect(slots.at(-1)?.errors).toEqual({ location: NOT_CONFIRMED });
    await waitFor(() => expect(summary()).toHaveFocus());
  });

  it('SIGN-22: depois de confirmar, o erro some e "Ir para Horário" avança', async () => {
    const { onContinue } = renderStep({ location: null });
    await submit();

    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar localização' }),
    );
    expect(summary()).not.toBeInTheDocument();
    await submit();

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('campo obrigatório vazio bloqueia e recebe o foco (A11Y-05)', async () => {
    const { onContinue, slots } = renderStep({ number: '' });

    await submit();

    expect(onContinue).not.toHaveBeenCalled();
    expect(slots.at(-1)).toEqual({
      idPrefix: 'signup-address',
      errors: { number: 'Informe o número (até 10 caracteres).' },
    });
    await waitFor(() => expect(screen.getByLabelText('Número')).toHaveFocus());
  });

  it('endereço completo e pino confirmado → avança', async () => {
    const { onContinue } = renderStep();

    await submit();

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(summary()).not.toBeInTheDocument();
  });

  it('"Voltar" chama onBack', async () => {
    const { onBack, onContinue } = renderStep();

    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onContinue).not.toHaveBeenCalled();
  });
});
