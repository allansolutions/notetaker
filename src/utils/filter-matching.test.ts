import { describe, it, expect } from 'vitest';
import { doesTaskMatchFilters, hasActiveFilters } from './filter-matching';
import { Task } from '../types';
import { SpreadsheetFilterState } from '../components/views/SpreadsheetView';

function createMockTask(overrides: Partial<Task> = {}): Task {
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

const emptyFilterState: SpreadsheetFilterState = {
  filters: {
    type: null,
    title: null,
    status: null,
    importance: null,
    dueDate: null,
  },
  dateFilterPreset: 'all',
};

describe('doesTaskMatchFilters', () => {
  describe('with no filters', () => {
    it('matches any task when no filters are active', () => {
      const task = createMockTask();
      expect(doesTaskMatchFilters(task, emptyFilterState)).toBe(true);
    });
  });

  describe('type filter', () => {
    it('matches when task type is in selected set', () => {
      const task = createMockTask({ type: 'admin' });
      const filterState: SpreadsheetFilterState = {
        ...emptyFilterState,
        filters: {
          ...emptyFilterState.filters,
          type: {
            type: 'multiselect',
            selected: new Set(['admin', 'personal']),
          },
        },
      };
      expect(doesTaskMatchFilters(task, filterState)).toBe(true);
    });

    it('does not match when task type is not in selected set', () => {
      const task = createMockTask({ type: 'admin' });
      const filterState: SpreadsheetFilterState = {
        ...emptyFilterState,
        filters: {
          ...emptyFilterState.filters,
          type: { type: 'multiselect', selected: new Set(['personal']) },
        },
      };
      expect(doesTaskMatchFilters(task, filterState)).toBe(false);
    });

    it('matches any task when multiselect has empty set', () => {
      const task = createMockTask({ type: 'admin' });
      const filterState: SpreadsheetFilterState = {
        ...emptyFilterState,
        filters: {
          ...emptyFilterState.filters,
          type: { type: 'multiselect', selected: new Set() },
        },
      };
      expect(doesTaskMatchFilters(task, filterState)).toBe(true);
    });
  });

  describe('status filter', () => {
    it('matches when task status is in selected set', () => {
      const task = createMockTask({ status: 'todo' });
      const filterState: SpreadsheetFilterState = {
        ...emptyFilterState,
        filters: {
          ...emptyFilterState.filters,
          status: {
            type: 'multiselect',
            selected: new Set(['todo', 'in-progress']),
          },
        },
      };
      expect(doesTaskMatchFilters(task, filterState)).toBe(true);
    });

    it('does not match when task status is not in selected set', () => {
      const task = createMockTask({ status: 'done' });
      const filterState: SpreadsheetFilterState = {
        ...emptyFilterState,
        filters: {
          ...emptyFilterState.filters,
          status: { type: 'multiselect', selected: new Set(['todo']) },
        },
      };
      expect(doesTaskMatchFilters(task, filterState)).toBe(false);
    });
  });

  describe('importance filter', () => {
    it('matches when task importance is in selected set', () => {
      const task = createMockTask({ importance: 'high' });
      const filterState: SpreadsheetFilterState = {
        ...emptyFilterState,
        filters: {
          ...emptyFilterState.filters,
          importance: { type: 'multiselect', selected: new Set(['high']) },
        },
      };
      expect(doesTaskMatchFilters(task, filterState)).toBe(true);
    });

    it('does not match when task importance is not in selected set', () => {
      const task = createMockTask({ importance: 'low' });
      const filterState: SpreadsheetFilterState = {
        ...emptyFilterState,
        filters: {
          ...emptyFilterState.filters,
          importance: { type: 'multiselect', selected: new Set(['high']) },
        },
      };
      expect(doesTaskMatchFilters(task, filterState)).toBe(false);
    });

    it('matches empty importance against empty string in filter', () => {
      const task = createMockTask({ importance: undefined });
      const filterState: SpreadsheetFilterState = {
        ...emptyFilterState,
        filters: {
          ...emptyFilterState.filters,
          importance: { type: 'multiselect', selected: new Set(['']) },
        },
      };
      expect(doesTaskMatchFilters(task, filterState)).toBe(true);
    });
  });

  describe('text filter for title', () => {
    it('matches when title contains search text', () => {
      const task = createMockTask({ title: 'Buy groceries' });
      const filterState: SpreadsheetFilterState = {
        ...emptyFilterState,
        filters: {
          ...emptyFilterState.filters,
          title: { type: 'text', value: 'Buy' },
        },
      };
      expect(doesTaskMatchFilters(task, filterState)).toBe(true);
    });

    it('does not match when title does not contain search text', () => {
      const task = createMockTask({ title: 'Call mom' });
      const filterState: SpreadsheetFilterState = {
        ...emptyFilterState,
        filters: {
          ...emptyFilterState.filters,
          title: { type: 'text', value: 'Buy' },
        },
      };
      expect(doesTaskMatchFilters(task, filterState)).toBe(false);
    });

    it('matches any task when text filter is empty', () => {
      const task = createMockTask({ title: 'Buy groceries' });
      const filterState: SpreadsheetFilterState = {
        ...emptyFilterState,
        filters: {
          ...emptyFilterState.filters,
          title: { type: 'text', value: '   ' },
        },
      };
      expect(doesTaskMatchFilters(task, filterState)).toBe(true);
    });

    it('matches with wildcard pattern in text filter', () => {
      const task = createMockTask({ title: 'Buy groceries' });
      const filterState: SpreadsheetFilterState = {
        ...emptyFilterState,
        filters: {
          ...emptyFilterState.filters,
          title: { type: 'text', value: 'Buy*' },
        },
      };
      expect(doesTaskMatchFilters(task, filterState)).toBe(true);
    });
  });

  describe('title-enhanced filter', () => {
    it('matches when selectedTaskIds is null and search text matches', () => {
      const task = createMockTask({ title: 'Buy groceries' });
      const filterState: SpreadsheetFilterState = {
        ...emptyFilterState,
        filters: {
          ...emptyFilterState.filters,
          title: {
            type: 'title-enhanced',
            searchText: 'Buy',
            selectedTaskIds: null,
          },
        },
      };
      expect(doesTaskMatchFilters(task, filterState)).toBe(true);
    });

    it('matches any task when search text is empty whitespace', () => {
      const task = createMockTask({ title: 'Buy groceries' });
      const filterState: SpreadsheetFilterState = {
        ...emptyFilterState,
        filters: {
          ...emptyFilterState.filters,
          title: {
            type: 'title-enhanced',
            searchText: '   ',
            selectedTaskIds: null,
          },
        },
      };
      expect(doesTaskMatchFilters(task, filterState)).toBe(true);
    });

    it('does not match when selectedTaskIds is null and search text does not match', () => {
      const task = createMockTask({ title: 'Call mom' });
      const filterState: SpreadsheetFilterState = {
        ...emptyFilterState,
        filters: {
          ...emptyFilterState.filters,
          title: {
            type: 'title-enhanced',
            searchText: 'Buy',
            selectedTaskIds: null,
          },
        },
      };
      expect(doesTaskMatchFilters(task, filterState)).toBe(false);
    });

    it('matches when task id is in selectedTaskIds', () => {
      const task = createMockTask({ id: 'task-1', title: 'Buy groceries' });
      const filterState: SpreadsheetFilterState = {
        ...emptyFilterState,
        filters: {
          ...emptyFilterState.filters,
          title: {
            type: 'title-enhanced',
            searchText: 'xyz', // search text ignored when selectedTaskIds is set
            selectedTaskIds: new Set(['task-1', 'task-2']),
          },
        },
      };
      expect(doesTaskMatchFilters(task, filterState)).toBe(true);
    });

    it('does not match when task id is not in selectedTaskIds', () => {
      const task = createMockTask({ id: 'task-3', title: 'Buy groceries' });
      const filterState: SpreadsheetFilterState = {
        ...emptyFilterState,
        filters: {
          ...emptyFilterState.filters,
          title: {
            type: 'title-enhanced',
            searchText: '',
            selectedTaskIds: new Set(['task-1', 'task-2']),
          },
        },
      };
      expect(doesTaskMatchFilters(task, filterState)).toBe(false);
    });

    it('matches with wildcard pattern', () => {
      const task = createMockTask({ title: 'Buy groceries today' });
      const filterState: SpreadsheetFilterState = {
        ...emptyFilterState,
        filters: {
          ...emptyFilterState.filters,
          title: {
            type: 'title-enhanced',
            searchText: 'Buy*',
            selectedTaskIds: null,
          },
        },
      };
      expect(doesTaskMatchFilters(task, filterState)).toBe(true);
    });
  });

  describe('dueDate column filter', () => {
    it('matches when task date matches filter date', () => {
      const date = new Date(2024, 5, 15);
      const task = createMockTask({ dueDate: date.getTime() });
      const filterState: SpreadsheetFilterState = {
        ...emptyFilterState,
        filters: {
          ...emptyFilterState.filters,
          dueDate: { type: 'date', value: date.getTime() },
        },
      };
      expect(doesTaskMatchFilters(task, filterState)).toBe(true);
    });

    it('does not match when task has no due date and filter has date', () => {
      const task = createMockTask({ dueDate: undefined });
      const filterState: SpreadsheetFilterState = {
        ...emptyFilterState,
        filters: {
          ...emptyFilterState.filters,
          dueDate: { type: 'date', value: Date.now() },
        },
      };
      expect(doesTaskMatchFilters(task, filterState)).toBe(false);
    });

    it('skips dueDate column filter when date preset is active', () => {
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const task = createMockTask({ dueDate: today.getTime() });
      const filterState: SpreadsheetFilterState = {
        ...emptyFilterState,
        filters: {
          ...emptyFilterState.filters,
          dueDate: { type: 'date', value: tomorrow.getTime() }, // would fail if checked
        },
        dateFilterPreset: 'today',
      };
      expect(doesTaskMatchFilters(task, filterState)).toBe(true);
    });
  });

  describe('date preset filter', () => {
    it('matches task with today due date when preset is today', () => {
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      const task = createMockTask({ dueDate: today.getTime() });
      const filterState: SpreadsheetFilterState = {
        ...emptyFilterState,
        dateFilterPreset: 'today',
      };
      expect(doesTaskMatchFilters(task, filterState)).toBe(true);
    });

    it('does not match task without due date when preset is today', () => {
      const task = createMockTask({ dueDate: undefined });
      const filterState: SpreadsheetFilterState = {
        ...emptyFilterState,
        dateFilterPreset: 'today',
      };
      expect(doesTaskMatchFilters(task, filterState)).toBe(false);
    });

    it('does not match task with future due date when preset is today', () => {
      const future = new Date();
      future.setDate(future.getDate() + 7);
      const task = createMockTask({ dueDate: future.getTime() });
      const filterState: SpreadsheetFilterState = {
        ...emptyFilterState,
        dateFilterPreset: 'today',
      };
      expect(doesTaskMatchFilters(task, filterState)).toBe(false);
    });
  });

  describe('combined filters', () => {
    it('matches when all filters match', () => {
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      const task = createMockTask({
        id: 'task-1',
        type: 'admin',
        title: 'Buy groceries',
        status: 'todo',
        importance: 'high',
        dueDate: today.getTime(),
      });
      const filterState: SpreadsheetFilterState = {
        filters: {
          type: { type: 'multiselect', selected: new Set(['admin']) },
          title: {
            type: 'title-enhanced',
            searchText: 'Buy',
            selectedTaskIds: null,
          },
          status: { type: 'multiselect', selected: new Set(['todo']) },
          importance: { type: 'multiselect', selected: new Set(['high']) },
          dueDate: null,
        },
        dateFilterPreset: 'today',
      };
      expect(doesTaskMatchFilters(task, filterState)).toBe(true);
    });

    it('does not match when one filter does not match', () => {
      const task = createMockTask({
        type: 'personal', // does not match
        status: 'todo',
      });
      const filterState: SpreadsheetFilterState = {
        ...emptyFilterState,
        filters: {
          ...emptyFilterState.filters,
          type: { type: 'multiselect', selected: new Set(['admin']) },
          status: { type: 'multiselect', selected: new Set(['todo']) },
        },
      };
      expect(doesTaskMatchFilters(task, filterState)).toBe(false);
    });
  });
});

describe('hasActiveFilters', () => {
  it('returns false when no filters are active', () => {
    expect(hasActiveFilters(emptyFilterState)).toBe(false);
  });

  it('returns true when date preset is not all', () => {
    const filterState: SpreadsheetFilterState = {
      ...emptyFilterState,
      dateFilterPreset: 'today',
    };
    expect(hasActiveFilters(filterState)).toBe(true);
  });

  it('returns true when multiselect filter has values', () => {
    const filterState: SpreadsheetFilterState = {
      ...emptyFilterState,
      filters: {
        ...emptyFilterState.filters,
        type: { type: 'multiselect', selected: new Set(['admin']) },
      },
    };
    expect(hasActiveFilters(filterState)).toBe(true);
  });

  it('returns true when text filter has value', () => {
    const filterState: SpreadsheetFilterState = {
      ...emptyFilterState,
      filters: {
        ...emptyFilterState.filters,
        title: { type: 'text', value: 'search' },
      },
    };
    expect(hasActiveFilters(filterState)).toBe(true);
  });

  it('returns true when title-enhanced filter has search text', () => {
    const filterState: SpreadsheetFilterState = {
      ...emptyFilterState,
      filters: {
        ...emptyFilterState.filters,
        title: {
          type: 'title-enhanced',
          searchText: 'search',
          selectedTaskIds: null,
        },
      },
    };
    expect(hasActiveFilters(filterState)).toBe(true);
  });

  it('returns true when title-enhanced filter has selectedTaskIds', () => {
    const filterState: SpreadsheetFilterState = {
      ...emptyFilterState,
      filters: {
        ...emptyFilterState.filters,
        title: {
          type: 'title-enhanced',
          searchText: '',
          selectedTaskIds: new Set(['1']),
        },
      },
    };
    expect(hasActiveFilters(filterState)).toBe(true);
  });

  it('returns false when title-enhanced has empty search and null selectedTaskIds', () => {
    const filterState: SpreadsheetFilterState = {
      ...emptyFilterState,
      filters: {
        ...emptyFilterState.filters,
        title: {
          type: 'title-enhanced',
          searchText: '',
          selectedTaskIds: null,
        },
      },
    };
    expect(hasActiveFilters(filterState)).toBe(false);
  });

  it('returns true when date filter has value', () => {
    const filterState: SpreadsheetFilterState = {
      ...emptyFilterState,
      filters: {
        ...emptyFilterState.filters,
        dueDate: { type: 'date', value: Date.now() },
      },
    };
    expect(hasActiveFilters(filterState)).toBe(true);
  });
});
