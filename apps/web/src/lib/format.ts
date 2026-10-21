// Isomorphic. Everything goes through Intl in pt-BR (PERF-06).
// Dates use a fixed time zone so server and browser print the same text.

type DateInput = Date | string;

const DAY_MS = 24 * 60 * 60 * 1000;

const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
});

const unitFormat = {
  MONTHS: new Intl.NumberFormat('pt-BR', {
    style: 'unit',
    unit: 'month',
    unitDisplay: 'long',
  }),
  YEARS: new Intl.NumberFormat('pt-BR', {
    style: 'unit',
    unit: 'year',
    unitDisplay: 'long',
  }),
};

const kmFormat = new Intl.NumberFormat('pt-BR', {
  style: 'unit',
  unit: 'kilometer',
  unitDisplay: 'short',
  maximumFractionDigits: 1,
});

const meterFormat = new Intl.NumberFormat('pt-BR', {
  style: 'unit',
  unit: 'meter',
  unitDisplay: 'short',
  maximumFractionDigits: 0,
});

/** ANI-01: "Cerca de 1 mês", "Cerca de 2 anos". */
export function formatAge(value: number, unit: 'MONTHS' | 'YEARS'): string {
  return `Cerca de ${unitFormat[unit].format(value)}`;
}

/** dd/mm/aaaa (DEMO-06). */
export function formatDate(date: DateInput): string {
  return dateFormat.format(new Date(date));
}

/** Whole days until `date`, rounded up (DEMO-06). Never negative. */
export function daysUntil(
  date: DateInput,
  now: DateInput = new Date(),
): number {
  const days = Math.ceil(
    (new Date(date).getTime() - new Date(now).getTime()) / DAY_MS,
  );

  return Math.max(0, days);
}

/** MAP-05: "850 m" below 1 km, "1,2 km" from there. */
export function formatDistance(km: number): string {
  const meters = Math.round(km * 1000);

  return meters < 1000 ? meterFormat.format(meters) : kmFormat.format(km);
}
