import { DateRange } from '../types';

/**
 * Get the user's locale, defaulting to 'en-GB' if unavailable.
 */
export function getUserLocale(): string {
  if (typeof navigator === 'undefined') return 'en-GB';
  return navigator.language || 'en-GB';
}

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

type DateOrder = 'dmy' | 'mdy' | 'ymd';

export type ParsedDateQuery =
  | { type: 'single'; date: number }
  | { type: 'range'; range: DateRange }
  | { type: 'invalid-range' }
  | { type: 'none' };

export function getLocaleDateOrder(locale: string): DateOrder {
  const sample = new Date(2001, 0, 2);
  const parts = new Intl.DateTimeFormat(locale).formatToParts(sample);
  const order = parts
    .filter((part) => ['day', 'month', 'year'].includes(part.type))
    .map((part) => part.type)
    .join('-');

  if (order.startsWith('month')) return 'mdy';
  if (order.startsWith('day')) return 'dmy';
  return 'ymd';
}

export function formatDateCompact(date: Date, locale: string): string {
  const day = date.getDate().toString();
  const month = new Intl.DateTimeFormat(locale, { month: 'short' }).format(
    date
  );
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export function formatDateRange(range: DateRange, locale: string): string {
  const startDate = new Date(range.start);
  const endDate = new Date(range.end);
  const startDay = startDate.getDate().toString();
  const endDay = endDate.getDate().toString();
  const startMonth = new Intl.DateTimeFormat(locale, { month: 'short' }).format(
    startDate
  );
  const endMonth = new Intl.DateTimeFormat(locale, { month: 'short' }).format(
    endDate
  );
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  if (startYear === endYear) {
    return `${startDay} ${startMonth} -> ${endDay} ${endMonth} ${endYear}`;
  }

  return `${startDay} ${startMonth} ${startYear} -> ${endDay} ${endMonth} ${endYear}`;
}

export function parseDateQuery(input: string, locale: string): ParsedDateQuery {
  const trimmed = input.trim();
  if (!trimmed) return { type: 'none' };

  const rangeParts = splitRangeInput(trimmed);
  if (rangeParts) {
    const [startInput, endInput] = rangeParts;
    const start = parseDateInput(startInput, locale);
    const end = parseDateInput(endInput, locale, start);
    if (start === null || end === null) return { type: 'none' };
    if (end < start) return { type: 'invalid-range' };
    return { type: 'range', range: { start, end } };
  }

  const date = parseDateInput(trimmed, locale);
  if (date === null) return { type: 'none' };
  return { type: 'single', date };
}

function parseDateInput(
  input: string,
  locale: string,
  inheritYearFrom?: number | null
): number | null {
  const normalized = input.toLowerCase().replace(/,/g, ' ').trim();
  if (!normalized) return null;

  return (
    parseIsoDate(normalized) ??
    parseNamedMonthDate(normalized, inheritYearFrom) ??
    parseNumericDate(normalized, locale)
  );
}

function splitRangeInput(input: string): [string, string] | null {
  const separators = [' - ', ' – ', ' — '];
  for (const separator of separators) {
    const index = input.indexOf(separator);
    if (index > 0 && index < input.length - separator.length) {
      const start = input.slice(0, index).trim();
      const end = input.slice(index + separator.length).trim();
      if (start && end) return [start, end];
    }
  }
  return null;
}

function parseIsoDate(value: string): number | null {
  const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  return buildDate(year, month, day);
}

function parseNamedMonthDate(
  value: string,
  inheritYearFrom?: number | null
): number | null {
  const tokens = value.split(/\s+/).filter(Boolean);
  const monthTokenIndex = tokens.findIndex((token) => token in MONTHS);
  if (monthTokenIndex < 0) return null;

  const dayToken = tokens[monthTokenIndex === 0 ? 1 : 0];
  if (!dayToken) return null;
  const day = Number(dayToken);
  if (!Number.isFinite(day)) return null;

  const yearToken = tokens.find((token) => /^\d{4}$/.test(token));
  const year = yearToken ? Number(yearToken) : getFallbackYear(inheritYearFrom);
  const month = MONTHS[tokens[monthTokenIndex]];
  return buildDate(year, month, day);
}

function parseNumericDate(value: string, locale: string): number | null {
  const match = value.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})$/);
  if (!match) return null;
  const first = Number(match[1]);
  const second = Number(match[2]);
  const year = normalizeYear(Number(match[3]));
  const order = getLocaleDateOrder(locale);
  const day = order === 'mdy' ? second : first;
  const month = order === 'mdy' ? first - 1 : second - 1;
  return buildDate(year, month, day);
}

function getFallbackYear(inheritYearFrom?: number | null): number {
  if (typeof inheritYearFrom === 'number') {
    return new Date(inheritYearFrom).getFullYear();
  }
  return new Date().getFullYear();
}

function buildDate(year: number, month: number, day: number): number | null {
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return null;
  }
  const date = new Date(year, month, day, 12, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date.getTime();
}

function normalizeYear(year: number): number {
  if (year < 100) return 2000 + year;
  return year;
}
