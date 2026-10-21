import type { OpeningHours } from '@/generated/prisma/client.js';

export type DayHours = Pick<
  OpeningHours,
  'dayOfWeek' | 'closed' | 'opensAt' | 'closesAt'
>;

export interface OpenStatus {
  openNow: boolean;
  /** 0 = Sunday, in the NGO's timezone. */
  todayIndex: number;
  today: DayHours | null;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Open when the local time is in [opensAt, closesAt) of a day not closed (NGO-02). */
export function computeOpenStatus(
  hours: readonly DayHours[],
  timezone: string,
  now: Date,
): OpenStatus {
  // h23 avoids "24:15" at midnight; HH:MM strings then compare in order.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const local = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const todayIndex = WEEKDAYS.indexOf(local.weekday);
  const time = `${local.hour}:${local.minute}`;

  const today = hours.find((h) => h.dayOfWeek === todayIndex) ?? null;
  const openNow =
    today !== null &&
    !today.closed &&
    today.opensAt! <= time &&
    time < today.closesAt!;

  return { openNow, todayIndex, today };
}
