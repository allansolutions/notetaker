import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDateFilter } from './useDateFilter';
import { Task } from '../types';

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    type: 'admin',
    title: 'Test Task',
    status: 'todo',
    blocks: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('useDateFilter', () => {
  describe('initial state', () => {
    it('uses default values when no initial values provided', () => {
      const { result } = renderHook(() => useDateFilter({ tasks: [] }));

      expect(result.current.preset).toBe('all');
      expect(result.current.date).toBeNull();
      expect(result.current.range).toBeNull();
    });

    it('uses provided initial values', () => {
      const { result } = renderHook(() =>
        useDateFilter({
          tasks: [],
          initialPreset: 'today',
          initialDate: 123456789,
          initialRange: { start: 1000, end: 2000 },
        })
      );

      expect(result.current.preset).toBe('today');
      expect(result.current.date).toBe(123456789);
      expect(result.current.range).toEqual({ start: 1000, end: 2000 });
    });
  });

  describe('onPresetChange', () => {
    it('sets preset and clears date when not specific-date', () => {
      const { result } = renderHook(() =>
        useDateFilter({
          tasks: [],
          initialDate: 123456789,
        })
      );

      act(() => {
        result.current.onPresetChange('today');
      });

      expect(result.current.preset).toBe('today');
      expect(result.current.date).toBeNull();
    });

    it('keeps date when changing to specific-date', () => {
      const { result } = renderHook(() =>
        useDateFilter({
          tasks: [],
          initialPreset: 'specific-date',
          initialDate: 123456789,
        })
      );

      act(() => {
        result.current.onPresetChange('specific-date');
      });

      expect(result.current.preset).toBe('specific-date');
      expect(result.current.date).toBe(123456789);
    });

    it('clears range when not date-range', () => {
      const { result } = renderHook(() =>
        useDateFilter({
          tasks: [],
          initialRange: { start: 1000, end: 2000 },
        })
      );

      act(() => {
        result.current.onPresetChange('tomorrow');
      });

      expect(result.current.preset).toBe('tomorrow');
      expect(result.current.range).toBeNull();
    });
  });

  describe('onDateChange', () => {
    it('sets preset to specific-date and updates date', () => {
      const { result } = renderHook(() => useDateFilter({ tasks: [] }));

      act(() => {
        result.current.onDateChange(123456789);
      });

      expect(result.current.preset).toBe('specific-date');
      expect(result.current.date).toBe(123456789);
      expect(result.current.range).toBeNull();
    });

    it('resets to all when date is null', () => {
      const { result } = renderHook(() =>
        useDateFilter({
          tasks: [],
          initialPreset: 'specific-date',
          initialDate: 123456789,
        })
      );

      act(() => {
        result.current.onDateChange(null);
      });

      expect(result.current.preset).toBe('all');
      expect(result.current.date).toBeNull();
    });
  });

  describe('onRangeChange', () => {
    it('sets preset to date-range and updates range', () => {
      const { result } = renderHook(() => useDateFilter({ tasks: [] }));

      act(() => {
        result.current.onRangeChange({ start: 1000, end: 2000 });
      });

      expect(result.current.preset).toBe('date-range');
      expect(result.current.range).toEqual({ start: 1000, end: 2000 });
      expect(result.current.date).toBeNull();
    });

    it('resets to all when range is null', () => {
      const { result } = renderHook(() =>
        useDateFilter({
          tasks: [],
          initialPreset: 'date-range',
          initialRange: { start: 1000, end: 2000 },
        })
      );

      act(() => {
        result.current.onRangeChange(null);
      });

      expect(result.current.preset).toBe('all');
      expect(result.current.range).toBeNull();
    });
  });

  describe('presetCounts', () => {
    it('counts all tasks', () => {
      const tasks = [createTask(), createTask({ id: 'task-2' })];
      const { result } = renderHook(() => useDateFilter({ tasks }));

      expect(result.current.presetCounts.all).toBe(2);
    });

    it('counts tasks due today', () => {
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      const tasks = [
        createTask({ dueDate: today.getTime() }),
        createTask({ id: 'task-2' }),
      ];
      const { result } = renderHook(() => useDateFilter({ tasks }));

      expect(result.current.presetCounts.today).toBe(1);
    });

    it('counts tasks due tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(12, 0, 0, 0);
      const tasks = [
        createTask({ dueDate: tomorrow.getTime() }),
        createTask({ id: 'task-2' }),
      ];
      const { result } = renderHook(() => useDateFilter({ tasks }));

      expect(result.current.presetCounts.tomorrow).toBe(1);
    });
  });
});
