import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  formatDateCompact,
  formatDateRange,
  getLocaleDateOrder,
  parseDateQuery,
  getUserLocale,
} from './date-query';

describe('date query parsing', () => {
  it('parses single dates with month names', () => {
    const result = parseDateQuery('10 Jan 2025', 'en-GB');
    expect(result.type).toBe('single');
    if (result.type === 'single') {
      const date = new Date(result.date);
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(10);
    }
  });

  it('parses date ranges with month names', () => {
    const result = parseDateQuery('10 Jan 2025 - 15 Jan 2025', 'en-GB');
    expect(result.type).toBe('range');
    if (result.type === 'range') {
      const start = new Date(result.range.start);
      const end = new Date(result.range.end);
      expect(start.getDate()).toBe(10);
      expect(end.getDate()).toBe(15);
    }
  });

  it('rejects invalid ranges', () => {
    const result = parseDateQuery('15 Jan 2025 - 10 Jan 2025', 'en-GB');
    expect(result.type).toBe('invalid-range');
  });

  it('parses numeric dates in locale order', () => {
    const gb = parseDateQuery('10/01/2025', 'en-GB');
    expect(gb.type).toBe('single');
    if (gb.type === 'single') {
      const date = new Date(gb.date);
      expect(date.getDate()).toBe(10);
      expect(date.getMonth()).toBe(0);
    }

    const us = parseDateQuery('10/01/2025', 'en-US');
    expect(us.type).toBe('single');
    if (us.type === 'single') {
      const date = new Date(us.date);
      expect(date.getDate()).toBe(1);
      expect(date.getMonth()).toBe(9);
    }
  });

  it('parses ISO dates', () => {
    const result = parseDateQuery('2025-01-10', 'en-GB');
    expect(result.type).toBe('single');
    if (result.type === 'single') {
      const date = new Date(result.date);
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(10);
    }
  });

  it('inherits year for range end', () => {
    const result = parseDateQuery('10 Jan 2025 - 15 Jan', 'en-GB');
    expect(result.type).toBe('range');
    if (result.type === 'range') {
      const end = new Date(result.range.end);
      expect(end.getFullYear()).toBe(2025);
    }
  });

  it('returns none for invalid input', () => {
    const result = parseDateQuery('not a date', 'en-GB');
    expect(result.type).toBe('none');
  });
});

describe('date formatting', () => {
  it('formats dates in compact style', () => {
    const date = new Date(2025, 0, 10, 12, 0, 0);
    expect(formatDateCompact(date, 'en-GB')).toBe('10 Jan 2025');
  });

  it('formats date ranges in compact style', () => {
    const range = {
      start: new Date(2025, 0, 10, 12, 0, 0).getTime(),
      end: new Date(2025, 0, 15, 12, 0, 0).getTime(),
    };
    expect(formatDateRange(range, 'en-GB')).toBe('10 Jan -> 15 Jan 2025');
  });

  it('formats cross-year ranges with both years', () => {
    const range = {
      start: new Date(2024, 11, 25, 12, 0, 0).getTime(),
      end: new Date(2025, 0, 5, 12, 0, 0).getTime(),
    };
    expect(formatDateRange(range, 'en-GB')).toBe('25 Dec 2024 -> 5 Jan 2025');
  });

  it('formats cross-month ranges within same year', () => {
    const range = {
      start: new Date(2025, 0, 25, 12, 0, 0).getTime(),
      end: new Date(2025, 1, 5, 12, 0, 0).getTime(),
    };
    expect(formatDateRange(range, 'en-GB')).toBe('25 Jan -> 5 Feb 2025');
  });
});

describe('edge cases', () => {
  it('returns none for empty input', () => {
    const result = parseDateQuery('', 'en-GB');
    expect(result.type).toBe('none');
  });

  it('returns none for whitespace-only input', () => {
    const result = parseDateQuery('   ', 'en-GB');
    expect(result.type).toBe('none');
  });

  it('returns none for invalid dates like Feb 30', () => {
    const result = parseDateQuery('30 Feb 2025', 'en-GB');
    expect(result.type).toBe('none');
  });

  it('parses dates with month before day', () => {
    const result = parseDateQuery('Jan 10 2025', 'en-US');
    expect(result.type).toBe('single');
    if (result.type === 'single') {
      const date = new Date(result.date);
      expect(date.getDate()).toBe(10);
      expect(date.getMonth()).toBe(0);
    }
  });

  it('handles two-digit years', () => {
    const result = parseDateQuery('10/01/25', 'en-GB');
    expect(result.type).toBe('single');
    if (result.type === 'single') {
      const date = new Date(result.date);
      expect(date.getFullYear()).toBe(2025);
    }
  });

  it('parses dates with dot separators', () => {
    const result = parseDateQuery('10.01.2025', 'en-GB');
    expect(result.type).toBe('single');
    if (result.type === 'single') {
      const date = new Date(result.date);
      expect(date.getDate()).toBe(10);
      expect(date.getMonth()).toBe(0);
    }
  });

  it('parses input with separator but missing end as single date', () => {
    // "10 Jan - " becomes "10 Jan" since the separator requires content on both sides
    const result = parseDateQuery('10 Jan - ', 'en-GB');
    expect(result.type).toBe('single');
  });

  it('returns none for month-only input with no day', () => {
    const result = parseDateQuery('January', 'en-GB');
    expect(result.type).toBe('none');
  });
});

describe('getLocaleDateOrder', () => {
  it('returns dmy for en-GB', () => {
    expect(getLocaleDateOrder('en-GB')).toBe('dmy');
  });

  it('returns mdy for en-US', () => {
    expect(getLocaleDateOrder('en-US')).toBe('mdy');
  });

  it('returns ymd for ja-JP', () => {
    expect(getLocaleDateOrder('ja-JP')).toBe('ymd');
  });

  it('returns ymd for zh-CN', () => {
    expect(getLocaleDateOrder('zh-CN')).toBe('ymd');
  });
});

describe('getUserLocale', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns navigator.language when available', () => {
    vi.stubGlobal('navigator', { language: 'fr-FR' });
    expect(getUserLocale()).toBe('fr-FR');
  });

  it('returns en-GB when navigator.language is empty', () => {
    vi.stubGlobal('navigator', { language: '' });
    expect(getUserLocale()).toBe('en-GB');
  });

  it('returns en-GB when navigator is undefined', () => {
    vi.stubGlobal('navigator', undefined);
    expect(getUserLocale()).toBe('en-GB');
  });
});
