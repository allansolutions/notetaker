import { describe, it, expect } from 'vitest';
import { parseTimeInput } from './time-parsing';

describe('parseTimeInput', () => {
  describe('plain numbers', () => {
    it('parses plain number as minutes', () => {
      expect(parseTimeInput('30')).toBe(30);
      expect(parseTimeInput('45')).toBe(45);
      expect(parseTimeInput('120')).toBe(120);
    });

    it('returns undefined for zero', () => {
      expect(parseTimeInput('0')).toBeUndefined();
    });

    it('returns undefined for negative numbers', () => {
      expect(parseTimeInput('-5')).toBeUndefined();
    });
  });

  describe('minutes format', () => {
    it('parses minutes with m suffix', () => {
      expect(parseTimeInput('30m')).toBe(30);
      expect(parseTimeInput('45m')).toBe(45);
    });

    it('returns undefined for 0m', () => {
      expect(parseTimeInput('0m')).toBeUndefined();
    });
  });

  describe('hours format', () => {
    it('parses hours as minutes', () => {
      expect(parseTimeInput('1h')).toBe(60);
      expect(parseTimeInput('2h')).toBe(120);
      expect(parseTimeInput('3h')).toBe(180);
    });

    it('returns undefined for 0h', () => {
      expect(parseTimeInput('0h')).toBeUndefined();
    });
  });

  describe('combined format', () => {
    it('parses hours and minutes with space', () => {
      expect(parseTimeInput('1h 30m')).toBe(90);
      expect(parseTimeInput('2h 15m')).toBe(135);
    });

    it('parses hours and minutes without space', () => {
      expect(parseTimeInput('1h30m')).toBe(90);
      expect(parseTimeInput('2h15m')).toBe(135);
    });

    it('parses hours with plain minutes (no m suffix)', () => {
      expect(parseTimeInput('1h 30')).toBe(90);
      expect(parseTimeInput('2h15')).toBe(135);
    });
  });

  describe('whitespace handling', () => {
    it('trims leading and trailing whitespace', () => {
      expect(parseTimeInput('  30m  ')).toBe(30);
      expect(parseTimeInput('  1h 30m  ')).toBe(90);
    });

    it('handles multiple spaces between hours and minutes', () => {
      expect(parseTimeInput('1h   30m')).toBe(90);
    });
  });

  describe('case insensitivity', () => {
    it('handles uppercase letters', () => {
      expect(parseTimeInput('1H')).toBe(60);
      expect(parseTimeInput('30M')).toBe(30);
      expect(parseTimeInput('1H 30M')).toBe(90);
    });

    it('handles mixed case', () => {
      expect(parseTimeInput('1h 30M')).toBe(90);
      expect(parseTimeInput('2H 15m')).toBe(135);
    });
  });

  describe('invalid inputs', () => {
    it('returns undefined for empty string', () => {
      expect(parseTimeInput('')).toBeUndefined();
    });

    it('returns undefined for whitespace only', () => {
      expect(parseTimeInput('   ')).toBeUndefined();
    });

    it('returns undefined for invalid format', () => {
      expect(parseTimeInput('abc')).toBeUndefined();
      expect(parseTimeInput('1.5h')).toBeUndefined();
      expect(parseTimeInput('1:30')).toBeUndefined();
      expect(parseTimeInput('1 hour')).toBeUndefined();
    });

    it('returns undefined for minutes before hours', () => {
      expect(parseTimeInput('30m 1h')).toBeUndefined();
    });
  });
});
