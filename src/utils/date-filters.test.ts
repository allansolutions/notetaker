import { describe, it, expect } from 'vitest';
import {
  startOfDay,
  endOfDay,
  getWeekStart,
  getWeekEnd,
  isOnDate,
  isInDateRange,
  matchesDatePreset,
} from './date-filters';

describe('startOfDay', () => {
  it('sets time to midnight', () => {
    const date = new Date(2024, 5, 15, 14, 30, 45, 500);
    const result = startOfDay(date);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  it('preserves the date', () => {
    const date = new Date(2024, 5, 15, 14, 30);
    const result = startOfDay(date);
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(5);
    expect(result.getDate()).toBe(15);
  });

  it('does not mutate the original date', () => {
    const date = new Date(2024, 5, 15, 14, 30);
    startOfDay(date);
    expect(date.getHours()).toBe(14);
  });
});

describe('endOfDay', () => {
  it('sets time to 23:59:59.999', () => {
    const date = new Date(2024, 5, 15, 14, 30, 45, 500);
    const result = endOfDay(date);
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
    expect(result.getSeconds()).toBe(59);
    expect(result.getMilliseconds()).toBe(999);
  });

  it('preserves the date', () => {
    const date = new Date(2024, 5, 15, 14, 30);
    const result = endOfDay(date);
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(5);
    expect(result.getDate()).toBe(15);
  });

  it('does not mutate the original date', () => {
    const date = new Date(2024, 5, 15, 14, 30);
    endOfDay(date);
    expect(date.getHours()).toBe(14);
  });
});

describe('getWeekStart', () => {
  it('returns Monday for a Wednesday date', () => {
    // June 19, 2024 is a Wednesday
    const wednesday = new Date(2024, 5, 19, 14, 30);
    const result = getWeekStart(wednesday);
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getDate()).toBe(17); // June 17
    expect(result.getHours()).toBe(0);
  });

  it('returns the same Monday for a Monday date', () => {
    // June 17, 2024 is a Monday
    const monday = new Date(2024, 5, 17, 14, 30);
    const result = getWeekStart(monday);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(17);
  });

  it('returns previous Monday for a Sunday date', () => {
    // June 23, 2024 is a Sunday
    const sunday = new Date(2024, 5, 23, 14, 30);
    const result = getWeekStart(sunday);
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getDate()).toBe(17); // June 17
  });

  it('handles week transition across months', () => {
    // July 3, 2024 is a Wednesday, week starts July 1 (Monday)
    const wednesday = new Date(2024, 6, 3);
    const result = getWeekStart(wednesday);
    expect(result.getMonth()).toBe(6); // July
    expect(result.getDate()).toBe(1);
  });

  it('does not mutate the original date', () => {
    const date = new Date(2024, 5, 19, 14, 30);
    getWeekStart(date);
    expect(date.getHours()).toBe(14);
    expect(date.getDate()).toBe(19);
  });
});

describe('getWeekEnd', () => {
  it('returns Sunday for a Wednesday date', () => {
    // June 19, 2024 is a Wednesday
    const wednesday = new Date(2024, 5, 19, 14, 30);
    const result = getWeekEnd(wednesday);
    expect(result.getDay()).toBe(0); // Sunday
    expect(result.getDate()).toBe(23); // June 23
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
  });

  it('returns the same Sunday for a Sunday date', () => {
    // June 23, 2024 is a Sunday
    const sunday = new Date(2024, 5, 23, 14, 30);
    const result = getWeekEnd(sunday);
    expect(result.getDay()).toBe(0);
    expect(result.getDate()).toBe(23);
  });

  it('returns following Sunday for a Monday date', () => {
    // June 17, 2024 is a Monday
    const monday = new Date(2024, 5, 17, 14, 30);
    const result = getWeekEnd(monday);
    expect(result.getDay()).toBe(0); // Sunday
    expect(result.getDate()).toBe(23); // June 23
  });

  it('handles week transition across months', () => {
    // June 26, 2024 is a Wednesday, week ends June 30 (Sunday)
    const wednesday = new Date(2024, 5, 26);
    const result = getWeekEnd(wednesday);
    expect(result.getMonth()).toBe(5); // June
    expect(result.getDate()).toBe(30);
  });
});

describe('isOnDate', () => {
  it('returns true for same calendar day', () => {
    const targetDate = new Date(2024, 5, 15);
    const timestamp = new Date(2024, 5, 15, 14, 30).getTime();
    expect(isOnDate(timestamp, targetDate)).toBe(true);
  });

  it('returns false for different day', () => {
    const targetDate = new Date(2024, 5, 15);
    const timestamp = new Date(2024, 5, 16).getTime();
    expect(isOnDate(timestamp, targetDate)).toBe(false);
  });

  it('handles midnight edge case', () => {
    const targetDate = new Date(2024, 5, 15);
    const midnight = new Date(2024, 5, 15, 0, 0, 0, 0).getTime();
    expect(isOnDate(midnight, targetDate)).toBe(true);
  });

  it('handles end of day edge case', () => {
    const targetDate = new Date(2024, 5, 15);
    const endOfDayTs = new Date(2024, 5, 15, 23, 59, 59, 999).getTime();
    expect(isOnDate(endOfDayTs, targetDate)).toBe(true);
  });

  it('returns false for different month', () => {
    const targetDate = new Date(2024, 5, 15);
    const timestamp = new Date(2024, 6, 15).getTime();
    expect(isOnDate(timestamp, targetDate)).toBe(false);
  });

  it('returns false for different year', () => {
    const targetDate = new Date(2024, 5, 15);
    const timestamp = new Date(2025, 5, 15).getTime();
    expect(isOnDate(timestamp, targetDate)).toBe(false);
  });
});

describe('isInDateRange', () => {
  it('returns true for timestamp within range', () => {
    const start = new Date(2024, 5, 15, 0, 0);
    const end = new Date(2024, 5, 20, 23, 59);
    const timestamp = new Date(2024, 5, 17, 12, 0).getTime();
    expect(isInDateRange(timestamp, start, end)).toBe(true);
  });

  it('returns true for timestamp at start boundary', () => {
    const start = new Date(2024, 5, 15, 0, 0);
    const end = new Date(2024, 5, 20, 23, 59);
    expect(isInDateRange(start.getTime(), start, end)).toBe(true);
  });

  it('returns true for timestamp at end boundary', () => {
    const start = new Date(2024, 5, 15, 0, 0);
    const end = new Date(2024, 5, 20, 23, 59);
    expect(isInDateRange(end.getTime(), start, end)).toBe(true);
  });

  it('returns false for timestamp before range', () => {
    const start = new Date(2024, 5, 15, 0, 0);
    const end = new Date(2024, 5, 20, 23, 59);
    const timestamp = new Date(2024, 5, 14, 23, 59).getTime();
    expect(isInDateRange(timestamp, start, end)).toBe(false);
  });

  it('returns false for timestamp after range', () => {
    const start = new Date(2024, 5, 15, 0, 0);
    const end = new Date(2024, 5, 20, 23, 59);
    const timestamp = new Date(2024, 5, 21, 0, 0).getTime();
    expect(isInDateRange(timestamp, start, end)).toBe(false);
  });
});

describe('matchesDatePreset', () => {
  describe('all preset', () => {
    it('returns true for tasks with dueDate', () => {
      const dueDate = new Date(2024, 5, 15).getTime();
      expect(matchesDatePreset(dueDate, 'all')).toBe(true);
    });

    it('returns true for tasks without dueDate', () => {
      expect(matchesDatePreset(undefined, 'all')).toBe(true);
    });
  });

  describe('today preset', () => {
    it('returns true for task due today', () => {
      const now = new Date(2024, 5, 15, 14, 0);
      const dueDate = new Date(2024, 5, 15, 10, 0).getTime();
      expect(matchesDatePreset(dueDate, 'today', now)).toBe(true);
    });

    it('returns false for task due tomorrow', () => {
      const now = new Date(2024, 5, 15, 14, 0);
      const dueDate = new Date(2024, 5, 16, 10, 0).getTime();
      expect(matchesDatePreset(dueDate, 'today', now)).toBe(false);
    });

    it('returns false for task due yesterday', () => {
      const now = new Date(2024, 5, 15, 14, 0);
      const dueDate = new Date(2024, 5, 14, 10, 0).getTime();
      expect(matchesDatePreset(dueDate, 'today', now)).toBe(false);
    });

    it('returns false for tasks without dueDate', () => {
      const now = new Date(2024, 5, 15, 14, 0);
      expect(matchesDatePreset(undefined, 'today', now)).toBe(false);
    });
  });

  describe('tomorrow preset', () => {
    it('returns true for task due tomorrow', () => {
      const now = new Date(2024, 5, 15, 14, 0);
      const dueDate = new Date(2024, 5, 16, 10, 0).getTime();
      expect(matchesDatePreset(dueDate, 'tomorrow', now)).toBe(true);
    });

    it('returns false for task due today', () => {
      const now = new Date(2024, 5, 15, 14, 0);
      const dueDate = new Date(2024, 5, 15, 10, 0).getTime();
      expect(matchesDatePreset(dueDate, 'tomorrow', now)).toBe(false);
    });

    it('returns false for task due in 2 days', () => {
      const now = new Date(2024, 5, 15, 14, 0);
      const dueDate = new Date(2024, 5, 17, 10, 0).getTime();
      expect(matchesDatePreset(dueDate, 'tomorrow', now)).toBe(false);
    });

    it('returns false for tasks without dueDate', () => {
      const now = new Date(2024, 5, 15, 14, 0);
      expect(matchesDatePreset(undefined, 'tomorrow', now)).toBe(false);
    });
  });

  describe('this-week preset', () => {
    // June 19, 2024 is a Wednesday
    // Week: Mon June 17 - Sun June 23

    it('returns true for task due same day', () => {
      const now = new Date(2024, 5, 19, 14, 0); // Wednesday
      const dueDate = new Date(2024, 5, 19, 10, 0).getTime();
      expect(matchesDatePreset(dueDate, 'this-week', now)).toBe(true);
    });

    it('returns true for task due on Monday of same week', () => {
      const now = new Date(2024, 5, 19, 14, 0); // Wednesday
      const dueDate = new Date(2024, 5, 17, 10, 0).getTime(); // Monday
      expect(matchesDatePreset(dueDate, 'this-week', now)).toBe(true);
    });

    it('returns true for task due on Sunday of same week', () => {
      const now = new Date(2024, 5, 19, 14, 0); // Wednesday
      const dueDate = new Date(2024, 5, 23, 10, 0).getTime(); // Sunday
      expect(matchesDatePreset(dueDate, 'this-week', now)).toBe(true);
    });

    it('returns false for task due last week', () => {
      const now = new Date(2024, 5, 19, 14, 0); // Wednesday
      const dueDate = new Date(2024, 5, 16, 10, 0).getTime(); // Previous Sunday
      expect(matchesDatePreset(dueDate, 'this-week', now)).toBe(false);
    });

    it('returns false for task due next week', () => {
      const now = new Date(2024, 5, 19, 14, 0); // Wednesday
      const dueDate = new Date(2024, 5, 24, 10, 0).getTime(); // Next Monday
      expect(matchesDatePreset(dueDate, 'this-week', now)).toBe(false);
    });

    it('returns false for tasks without dueDate', () => {
      const now = new Date(2024, 5, 19, 14, 0);
      expect(matchesDatePreset(undefined, 'this-week', now)).toBe(false);
    });

    it('handles week transition at month boundary', () => {
      // June 30, 2024 is a Sunday, week is June 24 - June 30
      const now = new Date(2024, 5, 30, 14, 0);
      const dueDateSameWeek = new Date(2024, 5, 28, 10, 0).getTime();
      const dueDateNextWeek = new Date(2024, 6, 1, 10, 0).getTime();
      expect(matchesDatePreset(dueDateSameWeek, 'this-week', now)).toBe(true);
      expect(matchesDatePreset(dueDateNextWeek, 'this-week', now)).toBe(false);
    });
  });
});
