import { describe, it, expect } from 'vitest';
import {
  serializeFiltersToParams,
  parseParamsToFilters,
  buildUrl,
  parseUrl,
  mergeWithDefaultFilters,
} from './urlSerializer';
import { SpreadsheetFilterState } from '../components/views/SpreadsheetView';

const emptyFilterState: SpreadsheetFilterState = {
  filters: {
    type: null,
    title: null,
    status: null,
    importance: null,
    dueDate: null,
  },
  dateFilterPreset: 'all',
  dateFilterDate: null,
  dateFilterRange: null,
};

describe('serializeFiltersToParams', () => {
  it('returns empty params for empty filter state', () => {
    const params = serializeFiltersToParams(emptyFilterState);
    expect(params.toString()).toBe('');
  });

  it('serializes date preset', () => {
    const state: SpreadsheetFilterState = {
      ...emptyFilterState,
      dateFilterPreset: 'today',
    };
    const params = serializeFiltersToParams(state);
    expect(params.get('date')).toBe('today');
  });

  it('serializes specific date', () => {
    const timestamp = 1737417600000;
    const state: SpreadsheetFilterState = {
      ...emptyFilterState,
      dateFilterPreset: 'specific-date',
      dateFilterDate: timestamp,
    };
    const params = serializeFiltersToParams(state);
    expect(params.get('date')).toBe('specific');
    expect(params.get('d')).toBe(String(timestamp));
  });

  it('serializes date range', () => {
    const state: SpreadsheetFilterState = {
      ...emptyFilterState,
      dateFilterPreset: 'date-range',
      dateFilterRange: {
        start: 1737417600000,
        end: 1737504000000,
      },
    };
    const params = serializeFiltersToParams(state);
    expect(params.get('date')).toBe('range');
    expect(params.get('start')).toBe('1737417600000');
    expect(params.get('end')).toBe('1737504000000');
  });

  it('serializes multiselect type filter', () => {
    const state: SpreadsheetFilterState = {
      ...emptyFilterState,
      filters: {
        ...emptyFilterState.filters,
        type: {
          type: 'multiselect',
          selected: new Set(['admin', 'operations']),
        },
      },
    };
    const params = serializeFiltersToParams(state);
    expect(params.get('type')).toBe('admin,operations');
  });

  it('serializes multiselect status filter', () => {
    const state: SpreadsheetFilterState = {
      ...emptyFilterState,
      filters: {
        ...emptyFilterState.filters,
        status: {
          type: 'multiselect',
          selected: new Set(['todo', 'in-progress']),
        },
      },
    };
    const params = serializeFiltersToParams(state);
    expect(params.get('status')).toBe('todo,in-progress');
  });

  it('serializes multiselect importance filter', () => {
    const state: SpreadsheetFilterState = {
      ...emptyFilterState,
      filters: {
        ...emptyFilterState.filters,
        importance: {
          type: 'multiselect',
          selected: new Set(['high', 'medium']),
        },
      },
    };
    const params = serializeFiltersToParams(state);
    expect(params.get('importance')).toBe('high,medium');
  });

  it('serializes text title filter', () => {
    const state: SpreadsheetFilterState = {
      ...emptyFilterState,
      filters: {
        ...emptyFilterState.filters,
        title: {
          type: 'text',
          value: 'search term',
        },
      },
    };
    const params = serializeFiltersToParams(state);
    expect(params.get('title')).toBe('search term');
  });

  it('serializes title-enhanced filter with search text', () => {
    const state: SpreadsheetFilterState = {
      ...emptyFilterState,
      filters: {
        ...emptyFilterState.filters,
        title: {
          type: 'title-enhanced',
          searchText: 'my search',
          selectedTaskIds: null,
        },
      },
    };
    const params = serializeFiltersToParams(state);
    expect(params.get('title')).toBe('my search');
  });

  it('omits empty text filters', () => {
    const state: SpreadsheetFilterState = {
      ...emptyFilterState,
      filters: {
        ...emptyFilterState.filters,
        title: {
          type: 'text',
          value: '  ',
        },
      },
    };
    const params = serializeFiltersToParams(state);
    expect(params.has('title')).toBe(false);
  });

  it('omits empty multiselect filters', () => {
    const state: SpreadsheetFilterState = {
      ...emptyFilterState,
      filters: {
        ...emptyFilterState.filters,
        type: {
          type: 'multiselect',
          selected: new Set(),
        },
      },
    };
    const params = serializeFiltersToParams(state);
    expect(params.has('type')).toBe(false);
  });

  it('serializes dueDate filter', () => {
    const timestamp = 1737417600000;
    const state: SpreadsheetFilterState = {
      ...emptyFilterState,
      filters: {
        ...emptyFilterState.filters,
        dueDate: {
          type: 'date',
          value: timestamp,
        },
      },
    };
    const params = serializeFiltersToParams(state);
    expect(params.get('dueDate')).toBe(String(timestamp));
  });
});

describe('parseParamsToFilters', () => {
  it('returns empty filters for empty params', () => {
    const params = new URLSearchParams();
    const result = parseParamsToFilters(params);
    expect(result.filters).toEqual({
      type: null,
      title: null,
      status: null,
      importance: null,
      dueDate: null,
    });
  });

  it('parses date preset', () => {
    const params = new URLSearchParams('date=today');
    const result = parseParamsToFilters(params);
    expect(result.dateFilterPreset).toBe('today');
  });

  it('parses specific date', () => {
    const params = new URLSearchParams('date=specific&d=1737417600000');
    const result = parseParamsToFilters(params);
    expect(result.dateFilterPreset).toBe('specific-date');
    expect(result.dateFilterDate).toBe(1737417600000);
  });

  it('parses date range', () => {
    const params = new URLSearchParams(
      'date=range&start=1737417600000&end=1737504000000'
    );
    const result = parseParamsToFilters(params);
    expect(result.dateFilterPreset).toBe('date-range');
    expect(result.dateFilterRange).toEqual({
      start: 1737417600000,
      end: 1737504000000,
    });
  });

  it('parses multiselect type filter', () => {
    const params = new URLSearchParams('type=admin,operations');
    const result = parseParamsToFilters(params);
    expect(result.filters!.type).toEqual({
      type: 'multiselect',
      selected: new Set(['admin', 'operations']),
    });
  });

  it('parses multiselect status filter', () => {
    const params = new URLSearchParams('status=todo,in-progress');
    const result = parseParamsToFilters(params);
    expect(result.filters!.status).toEqual({
      type: 'multiselect',
      selected: new Set(['todo', 'in-progress']),
    });
  });

  it('parses multiselect importance filter', () => {
    const params = new URLSearchParams('importance=high,medium');
    const result = parseParamsToFilters(params);
    expect(result.filters!.importance).toEqual({
      type: 'multiselect',
      selected: new Set(['high', 'medium']),
    });
  });

  it('parses title filter as text', () => {
    const params = new URLSearchParams('title=search+term');
    const result = parseParamsToFilters(params);
    expect(result.filters!.title).toEqual({
      type: 'text',
      value: 'search term',
    });
  });

  it('parses dueDate filter', () => {
    const params = new URLSearchParams('dueDate=1737417600000');
    const result = parseParamsToFilters(params);
    expect(result.filters!.dueDate).toEqual({
      type: 'date',
      value: 1737417600000,
    });
  });

  it('ignores invalid date presets', () => {
    const params = new URLSearchParams('date=invalid');
    const result = parseParamsToFilters(params);
    expect(result.dateFilterPreset).toBeUndefined();
  });
});

describe('roundtrip serialization', () => {
  it('roundtrips empty filter state', () => {
    const params = serializeFiltersToParams(emptyFilterState);
    const parsed = parseParamsToFilters(params);
    const merged = mergeWithDefaultFilters(parsed);
    expect(merged.dateFilterPreset).toBe('all');
    expect(merged.filters.type).toBeNull();
  });

  it('roundtrips complex filter state', () => {
    const state: SpreadsheetFilterState = {
      filters: {
        type: { type: 'multiselect', selected: new Set(['admin', 'personal']) },
        title: { type: 'text', value: 'my search' },
        status: { type: 'multiselect', selected: new Set(['todo']) },
        importance: { type: 'multiselect', selected: new Set(['high']) },
        dueDate: { type: 'date', value: 1737417600000 },
      },
      dateFilterPreset: 'specific-date',
      dateFilterDate: 1737504000000,
      dateFilterRange: null,
    };
    const params = serializeFiltersToParams(state);
    const parsed = parseParamsToFilters(params);
    const merged = mergeWithDefaultFilters(parsed);

    expect(merged.dateFilterPreset).toBe('specific-date');
    expect(merged.dateFilterDate).toBe(1737504000000);
    expect(merged.filters.type).toEqual({
      type: 'multiselect',
      selected: new Set(['admin', 'personal']),
    });
    expect(merged.filters.title).toEqual({
      type: 'text',
      value: 'my search',
    });
    expect(merged.filters.status).toEqual({
      type: 'multiselect',
      selected: new Set(['todo']),
    });
  });
});

describe('buildUrl', () => {
  it('builds root path for spreadsheet view', () => {
    expect(buildUrl('spreadsheet')).toBe('/');
  });

  it('builds task detail path', () => {
    expect(buildUrl('task-detail', 'task-123')).toBe('/task/task-123');
  });

  it('builds details path', () => {
    expect(buildUrl('full-day-details')).toBe('/details');
  });

  it('builds archive path', () => {
    expect(buildUrl('archive')).toBe('/archive');
  });

  it('includes filters for spreadsheet view', () => {
    const state: SpreadsheetFilterState = {
      ...emptyFilterState,
      dateFilterPreset: 'today',
    };
    expect(buildUrl('spreadsheet', null, state)).toBe('/?date=today');
  });

  it('includes filters for details view', () => {
    const state: SpreadsheetFilterState = {
      ...emptyFilterState,
      dateFilterPreset: 'today',
    };
    expect(buildUrl('full-day-details', null, state)).toBe(
      '/details?date=today'
    );
  });

  it('does not include filters for task-detail view', () => {
    const state: SpreadsheetFilterState = {
      ...emptyFilterState,
      dateFilterPreset: 'today',
    };
    expect(buildUrl('task-detail', 'task-123', state)).toBe('/task/task-123');
  });

  it('does not include filters for archive view', () => {
    const state: SpreadsheetFilterState = {
      ...emptyFilterState,
      dateFilterPreset: 'today',
    };
    expect(buildUrl('archive', null, state)).toBe('/archive');
  });

  it('falls back to root when task-detail has no taskId', () => {
    expect(buildUrl('task-detail', null)).toBe('/');
  });

  it('builds crm-list path', () => {
    expect(buildUrl('crm-list')).toBe('/crm');
  });

  it('builds crm-new path', () => {
    expect(buildUrl('crm-new')).toBe('/crm/new');
  });

  it('builds crm-detail path with contactId', () => {
    expect(buildUrl('crm-detail', null, undefined, 'contact-123')).toBe(
      '/crm/contacts/contact-123'
    );
  });

  it('falls back to /crm when crm-detail has no contactId', () => {
    expect(buildUrl('crm-detail', null, undefined, null)).toBe('/crm');
  });
});

describe('parseUrl', () => {
  it('parses root path as spreadsheet', () => {
    const result = parseUrl('/', '');
    expect(result.view).toBe('spreadsheet');
    expect(result.taskId).toBeNull();
  });

  it('parses task detail path', () => {
    const result = parseUrl('/task/task-123', '');
    expect(result.view).toBe('task-detail');
    expect(result.taskId).toBe('task-123');
  });

  it('parses details path', () => {
    const result = parseUrl('/details', '');
    expect(result.view).toBe('full-day-details');
  });

  it('parses archive path', () => {
    const result = parseUrl('/archive', '');
    expect(result.view).toBe('archive');
  });

  it('parses query params as filters', () => {
    const result = parseUrl('/', '?date=today&type=admin');
    expect(result.filters.dateFilterPreset).toBe('today');
    expect(result.filters.filters?.type).toEqual({
      type: 'multiselect',
      selected: new Set(['admin']),
    });
  });

  it('handles unknown paths as spreadsheet', () => {
    const result = parseUrl('/unknown/path', '');
    expect(result.view).toBe('spreadsheet');
  });

  it('parses crm-list path', () => {
    const result = parseUrl('/crm', '');
    expect(result.view).toBe('crm-list');
    expect(result.contactId).toBeNull();
  });

  it('parses crm-new path', () => {
    const result = parseUrl('/crm/new', '');
    expect(result.view).toBe('crm-new');
    expect(result.contactId).toBeNull();
  });

  it('parses crm-detail path', () => {
    const result = parseUrl('/crm/contacts/contact-123', '');
    expect(result.view).toBe('crm-detail');
    expect(result.contactId).toBe('contact-123');
  });
});

describe('mergeWithDefaultFilters', () => {
  it('fills in missing filter fields with defaults', () => {
    const partial = {
      dateFilterPreset: 'today' as const,
      filters: {
        type: { type: 'multiselect' as const, selected: new Set(['admin']) },
        title: null,
        status: null,
        importance: null,
        dueDate: null,
      },
    };
    const merged = mergeWithDefaultFilters(partial);
    expect(merged.dateFilterPreset).toBe('today');
    expect(merged.dateFilterDate).toBeNull();
    expect(merged.dateFilterRange).toBeNull();
    expect(merged.filters.type).toEqual({
      type: 'multiselect',
      selected: new Set(['admin']),
    });
    expect(merged.filters.title).toBeNull();
  });

  it('returns full defaults for empty partial', () => {
    const merged = mergeWithDefaultFilters({});
    expect(merged.dateFilterPreset).toBe('all');
    expect(merged.dateFilterDate).toBeNull();
    expect(merged.dateFilterRange).toBeNull();
    expect(merged.filters.type).toBeNull();
    expect(merged.filters.title).toBeNull();
    expect(merged.filters.status).toBeNull();
    expect(merged.filters.importance).toBeNull();
    expect(merged.filters.dueDate).toBeNull();
  });
});
