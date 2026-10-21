import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { DayHours } from '../ngo-account.types';
import { HoursFields } from './hours-fields.client';

const WEEK: DayHours[] = Array.from({ length: 7 }, (_, dayOfWeek) =>
  dayOfWeek === 0
    ? { dayOfWeek, closed: true, opensAt: null, closesAt: null }
    : { dayOfWeek, closed: false, opensAt: '09:00', closesAt: '18:00' },
);

function renderFields(
  values: DayHours[] = WEEK,
  errors?: Partial<Record<number, string>>,
) {
  let current = values;

  function Harness() {
    const [state, setState] = useState(values);
    current = state;
    return (
      <HoursFields
        values={state}
        onChange={setState}
        errors={errors}
        idPrefix="hours"
      />
    );
  }

  render(<Harness />);
  return () => current;
}

const day = (name: string) => screen.getByRole('group', { name });
const day$ = (week: DayHours[], dayOfWeek: number) =>
  week.find((d) => d.dayOfWeek === dayOfWeek)!;

describe('HoursFields', () => {
  it('SIGN-23: mostra os 7 dias, de segunda a domingo, com aberto/fechado e os horários', () => {
    renderFields();

    expect(
      screen
        .getAllByRole('group')
        .map((g) => g.querySelector('legend')?.textContent),
    ).toEqual([
      'Segunda',
      'Terça',
      'Quarta',
      'Quinta',
      'Sexta',
      'Sábado',
      'Domingo',
    ]);
    const monday = within(day('Segunda'));
    expect(
      monday.getByRole('switch', { name: 'Segunda: aberta' }),
    ).toBeChecked();
    expect(monday.getByLabelText('Abertura')).toHaveValue('09:00');
    expect(monday.getByLabelText('Fechamento')).toHaveValue('18:00');
    const sunday = within(day('Domingo'));
    expect(
      sunday.getByRole('switch', { name: 'Domingo: aberta' }),
    ).not.toBeChecked();
    expect(sunday.queryByLabelText('Abertura')).not.toBeInTheDocument();
  });

  it('SIGN-23: fechar um dia esconde os horários; abrir de novo mostra 09:00–18:00', async () => {
    const values = renderFields();

    await userEvent.click(
      within(day('Terça')).getByRole('switch', { name: 'Terça: aberta' }),
    );
    expect(day$(values(), 2).closed).toBe(true);
    expect(
      within(day('Terça')).queryByLabelText('Abertura'),
    ).not.toBeInTheDocument();

    await userEvent.click(
      within(day('Domingo')).getByRole('switch', { name: 'Domingo: aberta' }),
    );
    expect(day$(values(), 0)).toEqual({
      dayOfWeek: 0,
      closed: false,
      opensAt: '09:00',
      closesAt: '18:00',
    });
  });

  it('SIGN-23: reabrir um dia mantém o horário que ele tinha', async () => {
    const values = renderFields(
      WEEK.map((d) =>
        d.dayOfWeek === 3
          ? { ...d, closed: true, opensAt: '10:00', closesAt: '14:00' }
          : d,
      ),
    );

    await userEvent.click(
      within(day('Quarta')).getByRole('switch', { name: 'Quarta: aberta' }),
    );

    expect(day$(values(), 3)).toMatchObject({
      closed: false,
      opensAt: '10:00',
      closesAt: '14:00',
    });
  });

  it('SIGN-23: muda a abertura e o fechamento de um dia', () => {
    const values = renderFields();
    const friday = within(day('Sexta'));

    fireEvent.change(friday.getByLabelText('Abertura'), {
      target: { value: '08:30' },
    });
    fireEvent.change(friday.getByLabelText('Fechamento'), {
      target: { value: '17:00' },
    });

    expect(day$(values(), 5)).toMatchObject({
      opensAt: '08:30',
      closesAt: '17:00',
    });
    expect(day$(values(), 4)).toMatchObject({
      opensAt: '09:00',
      closesAt: '18:00',
    });
  });

  it('SIGN-23: um dia aberto sem horário mostra os campos vazios para preencher', () => {
    renderFields(
      WEEK.map((d) =>
        d.dayOfWeek === 2 ? { ...d, opensAt: null, closesAt: null } : d,
      ),
    );

    expect(within(day('Terça')).getByLabelText('Abertura')).toHaveValue('');
    expect(within(day('Terça')).getByLabelText('Fechamento')).toHaveValue('');
  });

  it('SIGN-24: "Copiar o horário de segunda para todos os dias" replica estado e intervalo nos outros 6 dias', async () => {
    const values = renderFields(
      WEEK.map((d) =>
        d.dayOfWeek === 1
          ? { ...d, opensAt: '08:00', closesAt: '12:00' }
          : d.dayOfWeek === 6
            ? { ...d, opensAt: '09:00', closesAt: '13:00' }
            : d,
      ),
    );

    await userEvent.click(
      screen.getByRole('button', {
        name: 'Copiar o horário de segunda para todos os dias',
      }),
    );

    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      expect(day$(values(), dayOfWeek)).toEqual({
        dayOfWeek,
        closed: false,
        opensAt: '08:00',
        closesAt: '12:00',
      });
    }
    expect(within(day('Domingo')).getByLabelText('Fechamento')).toHaveValue(
      '12:00',
    );
  });

  it('SIGN-24: segunda fechada → copiar fecha os outros 6 dias', async () => {
    const values = renderFields(
      WEEK.map((d) => (d.dayOfWeek === 1 ? { ...d, closed: true } : d)),
    );

    await userEvent.click(
      screen.getByRole('button', {
        name: 'Copiar o horário de segunda para todos os dias',
      }),
    );

    expect(values().every((d) => d.closed)).toBe(true);
  });

  it('SIGN-25: mostra o erro do intervalo no dia, ligado aos campos', () => {
    renderFields(
      WEEK.map((d) =>
        d.dayOfWeek === 1 ? { ...d, opensAt: '18:00', closesAt: '09:00' } : d,
      ),
      { 1: 'O horário de fechamento deve ser depois da abertura.' },
    );
    const monday = within(day('Segunda'));

    expect(monday.getByLabelText('Fechamento')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(monday.getByLabelText('Abertura')).toHaveAccessibleDescription(
      'O horário de fechamento deve ser depois da abertura.',
    );
    expect(
      within(day('Terça')).getByLabelText('Fechamento'),
    ).not.toHaveAttribute('aria-invalid');
    expect(document.getElementById('hours-1-opens')).toBe(
      monday.getByLabelText('Abertura'),
    );
  });
});
