import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { DayValues, HoursValues } from '../signup.types';
import { StepHours, type HoursSlot } from './step-hours.client';

const SIGN_25 = 'O horário de fechamento deve ser depois da abertura.';
const WEEK: DayValues[] = Array.from({ length: 7 }, (_, dayOfWeek) =>
  dayOfWeek === 0
    ? { dayOfWeek, closed: true, opensAt: null, closesAt: null }
    : { dayOfWeek, closed: false, opensAt: '09:00', closesAt: '18:00' },
);
const withDay = (
  dayOfWeek: number,
  patch: Partial<DayValues>,
): HoursValues => ({
  openingHours: WEEK.map((d) =>
    d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d,
  ),
});

function renderStep(values: HoursValues = { openingHours: WEEK }) {
  const onContinue = vi.fn();
  const onBack = vi.fn();
  const slots: HoursSlot[] = [];

  function Harness() {
    const [state, setState] = useState(values);
    return (
      <StepHours
        values={state}
        renderFields={(slot) => {
          slots.push(slot);
          const monday = state.openingHours.find((d) => d.dayOfWeek === 1)!;
          return (
            <div>
              <label htmlFor={`${slot.idPrefix}-1-closes`}>Fechamento</label>
              <input
                id={`${slot.idPrefix}-1-closes`}
                value={monday.closesAt ?? ''}
                aria-invalid={slot.errors[1] ? true : undefined}
                onChange={(e) =>
                  setState((s) => ({
                    openingHours: s.openingHours.map((d) =>
                      d.dayOfWeek === 1
                        ? { ...d, closesAt: e.target.value }
                        : d,
                    ),
                  }))
                }
              />
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
  userEvent.click(screen.getByRole('button', { name: 'Revisar cadastro' }));
const summary = () =>
  screen.queryByRole('region', { name: 'Corrija para continuar' });

describe('StepHours', () => {
  it('mostra o título e a explicação da etapa', () => {
    renderStep();

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Horário de funcionamento',
      }),
    ).toBeVisible();
    expect(
      screen.getByText('Com ele mostramos “aberta agora” no mapa.'),
    ).toBeVisible();
  });

  it('SIGN-25: 18:00–09:00 bloqueia o avanço com a mensagem no dia e no resumo', async () => {
    const { onContinue, slots } = renderStep(
      withDay(1, { opensAt: '18:00', closesAt: '09:00' }),
    );

    await submit();

    expect(onContinue).not.toHaveBeenCalled();
    expect(slots.at(-1)).toEqual({
      idPrefix: 'signup-hours',
      errors: { 1: SIGN_25 },
    });
    expect(
      screen.getByRole('link', { name: `Segunda: ${SIGN_25}` }),
    ).toHaveAttribute('href', '#signup-hours-1-opens');
    await waitFor(() =>
      expect(screen.getByLabelText('Fechamento')).toHaveFocus(),
    );
  });

  it('SIGN-25: fechamento igual à abertura também bloqueia', async () => {
    const { onContinue, slots } = renderStep(
      withDay(5, { opensAt: '09:00', closesAt: '09:00' }),
    );

    await submit();

    expect(onContinue).not.toHaveBeenCalled();
    expect(slots.at(-1)?.errors).toEqual({ 5: SIGN_25 });
    expect(
      screen.getByRole('link', { name: `Sexta: ${SIGN_25}` }),
    ).toBeVisible();
  });

  it('SIGN-25: corrigir o horário apaga o erro, e o avanço passa', async () => {
    const { onContinue } = renderStep(
      withDay(1, { opensAt: '18:00', closesAt: '09:00' }),
    );
    await submit();

    fireEvent.change(screen.getByLabelText('Fechamento'), {
      target: { value: '20:00' },
    });
    expect(summary()).not.toBeInTheDocument();
    await submit();

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('dia fechado não é validado; a semana válida avança', async () => {
    const { onContinue } = renderStep();

    await submit();

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(summary()).not.toBeInTheDocument();
  });

  it('"Voltar" chama onBack', async () => {
    const { onBack } = renderStep();

    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
