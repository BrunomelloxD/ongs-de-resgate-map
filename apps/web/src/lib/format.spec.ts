import { daysUntil, formatAge, formatDate, formatDistance } from './format';

// Intl separates number and unit with a no-break space in some ICU versions.
const plain = (text: string) => text.replace(/ /g, ' ');

describe('formatAge', () => {
  it.each([
    [1, 'MONTHS', 'Cerca de 1 mês'],
    [2, 'MONTHS', 'Cerca de 2 meses'],
    [11, 'MONTHS', 'Cerca de 11 meses'],
    [1, 'YEARS', 'Cerca de 1 ano'],
    [2, 'YEARS', 'Cerca de 2 anos'],
    [15, 'YEARS', 'Cerca de 15 anos'],
  ] as const)('%i %s vira "%s"', (value, unit, expected) => {
    expect(plain(formatAge(value, unit))).toBe(expected);
  });
});

describe('formatDate', () => {
  it('formata dd/mm/aaaa', () => {
    expect(formatDate('2026-10-27T15:00:00Z')).toBe('27/10/2026');
  });

  it('aceita Date', () => {
    expect(formatDate(new Date('2026-01-05T15:00:00Z'))).toBe('05/01/2026');
  });

  it.each(['UTC', 'Asia/Tokyo', 'America/New_York'])(
    'usa o dia de São Paulo com o processo em %s',
    (tz) => {
      const original = process.env['TZ'];
      process.env['TZ'] = tz;
      try {
        // 02:30 UTC is still the previous day in São Paulo (UTC-3).
        expect(formatDate('2026-10-28T02:30:00Z')).toBe('27/10/2026');
      } finally {
        process.env['TZ'] = original;
      }
    },
  );
});

describe('daysUntil', () => {
  const now = new Date('2026-10-20T12:00:00Z');

  it('6 dias e 1 hora → 7 (arredonda para cima)', () => {
    expect(daysUntil('2026-10-26T13:00:00Z', now)).toBe(7);
  });

  it('exatamente 6 dias → 6', () => {
    expect(daysUntil('2026-10-26T12:00:00Z', now)).toBe(6);
  });

  it('1 minuto → 1', () => {
    expect(daysUntil('2026-10-20T12:01:00Z', now)).toBe(1);
  });

  it('no mesmo instante ou no passado → 0', () => {
    expect(daysUntil(now, now)).toBe(0);
    expect(daysUntil('2026-10-10T12:00:00Z', now)).toBe(0);
  });

  it('sem `now`, usa o relógio atual', () => {
    vi.useFakeTimers({ now: new Date('2026-10-20T12:00:00Z') });
    try {
      expect(daysUntil('2026-10-23T12:00:00Z')).toBe(3);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('formatDistance', () => {
  it.each([
    [1.2, '1,2 km'],
    [0.85, '850 m'],
    [12.34, '12,3 km'],
    [0.004, '4 m'],
    [0.9996, '1 km'],
    [25, '25 km'],
  ])('%f km vira "%s"', (km, expected) => {
    expect(plain(formatDistance(km))).toBe(expected);
  });
});
