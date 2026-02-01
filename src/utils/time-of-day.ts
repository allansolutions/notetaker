import type { TimeOfDay } from '../types';

export const PERIODS: TimeOfDay[] = ['morning', 'afternoon', 'evening'];

export const PERIOD_BOUNDARIES = {
  morning: { start: 0, end: 12 },
  afternoon: { start: 12, end: 18 },
  evening: { start: 18, end: 22 },
} as const;

export const PERIOD_LABELS: Record<TimeOfDay, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};

/** Minutes remaining in the given period from `now`. */
export function getPeriodMinutesLeft(
  period: TimeOfDay,
  now: Date = new Date()
): number {
  const { start, end } = PERIOD_BOUNDARIES[period];
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinute;

  const endMinutes = end * 60;
  const startMinutes = start * 60;

  if (currentTotalMinutes >= endMinutes) {
    // Period has passed
    return 0;
  }

  if (currentTotalMinutes < startMinutes) {
    // Period hasn't started yet - return full duration
    return endMinutes - startMinutes;
  }

  // Currently in this period
  return endMinutes - currentTotalMinutes;
}

/** Whether the period has fully elapsed. */
export function isPeriodPast(
  period: TimeOfDay,
  now: Date = new Date()
): boolean {
  const { end } = PERIOD_BOUNDARIES[period];
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  return currentHour * 60 + currentMinute >= end * 60;
}

/** Current active period based on time of day, or null if outside all periods (after 10pm). */
export function getCurrentPeriod(now: Date = new Date()): TimeOfDay | null {
  const currentHour = now.getHours();

  if (currentHour < 12) return 'morning';
  if (currentHour < 18) return 'afternoon';
  if (currentHour < 22) return 'evening';
  return null;
}
