import { computeOpenStatus, type DayHours } from '../open-status.js';

const SAO_PAULO = 'America/Sao_Paulo'; // UTC−3
const MANAUS = 'America/Manaus'; // UTC−4

function day(
  dayOfWeek: number,
  opensAt: string | null,
  closesAt: string | null,
): DayHours {
  return { dayOfWeek, closed: opensAt === null, opensAt, closesAt };
}

// Sunday closed, weekdays 09:00–18:00, Saturday 09:00–13:00.
const WEEK: DayHours[] = [
  day(0, null, null),
  day(1, '09:00', '18:00'),
  day(2, '09:00', '18:00'),
  day(3, '09:00', '18:00'),
  day(4, '09:00', '18:00'),
  day(5, '09:00', '18:00'),
  day(6, '09:00', '13:00'),
];
const WEDNESDAY = WEEK[3];

describe('computeOpenStatus', () => {
  it('aberta dentro do intervalo (quarta 09:30 em São Paulo)', () => {
    expect(
      computeOpenStatus(WEEK, SAO_PAULO, new Date('2026-10-21T12:30:00Z')),
    ).toEqual({ openNow: true, todayIndex: 3, today: WEDNESDAY });
  });

  it('fechada exatamente em closesAt (18:00)', () => {
    expect(
      computeOpenStatus(WEEK, SAO_PAULO, new Date('2026-10-21T21:00:00Z')),
    ).toEqual({ openNow: false, todayIndex: 3, today: WEDNESDAY });
  });

  it('aberta no último segundo antes de closesAt (17:59:59)', () => {
    expect(
      computeOpenStatus(WEEK, SAO_PAULO, new Date('2026-10-21T20:59:59Z'))
        .openNow,
    ).toBe(true);
  });

  it('aberta exatamente em opensAt (09:00)', () => {
    expect(
      computeOpenStatus(WEEK, SAO_PAULO, new Date('2026-10-21T12:00:00Z'))
        .openNow,
    ).toBe(true);
  });

  it('fechada antes de opensAt (08:59)', () => {
    expect(
      computeOpenStatus(WEEK, SAO_PAULO, new Date('2026-10-21T11:59:00Z'))
        .openNow,
    ).toBe(false);
  });

  it('fechada num dia marcado como fechado (domingo 12:00)', () => {
    expect(
      computeOpenStatus(WEEK, SAO_PAULO, new Date('2026-10-25T15:00:00Z')),
    ).toEqual({ openNow: false, todayIndex: 0, today: WEEK[0] });
  });

  it('o mesmo instante dá resultados diferentes em São Paulo e em Manaus', () => {
    const instant = new Date('2026-10-21T12:30:00Z'); // 09:30 SP, 08:30 Manaus

    expect(computeOpenStatus(WEEK, SAO_PAULO, instant).openNow).toBe(true);
    expect(computeOpenStatus(WEEK, MANAUS, instant).openNow).toBe(false);
  });

  it('usa o dia da semana no fuso da ONG, não em UTC', () => {
    // Thursday 02:30 UTC is still Wednesday 23:30 in São Paulo.
    expect(
      computeOpenStatus(WEEK, SAO_PAULO, new Date('2026-10-22T02:30:00Z')),
    ).toEqual({ openNow: false, todayIndex: 3, today: WEDNESDAY });
  });

  it('trata meia-noite como 00:00 (abre às 00:00, agora 00:15)', () => {
    const night = [day(3, '00:00', '06:00')];

    expect(
      computeOpenStatus(night, SAO_PAULO, new Date('2026-10-21T03:15:00Z')),
    ).toEqual({ openNow: true, todayIndex: 3, today: night[0] });
  });

  it('fechada e sem horário de hoje quando o dia não tem registro', () => {
    expect(
      computeOpenStatus([WEEK[1]], SAO_PAULO, new Date('2026-10-21T12:30:00Z')),
    ).toEqual({ openNow: false, todayIndex: 3, today: null });
  });
});
