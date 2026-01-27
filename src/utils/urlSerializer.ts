import { ViewType, DateFilterPreset, DateRange } from '../types';
import { SpreadsheetFilterState } from '../components/views/SpreadsheetView';
import type { GroupByMode } from '../components/spreadsheet/TaskTable';

export interface RouterState {
  view: ViewType;
  taskId: string | null;
  contactId: string | null;
  wikiPageId: string | null;
  filters: Partial<SpreadsheetFilterState>;
  groupBy?: GroupByMode;
}

/**
 * Serialize a multiselect filter to a comma-separated lowercase string
 */
function serializeMultiselect(values: Set<string>): string | null {
  if (values.size === 0) return null;
  return Array.from(values).join(',');
}

/**
 * Parse a comma-separated string back to a Set
 */
function parseMultiselect(value: string): Set<string> {
  return new Set(value.split(',').filter(Boolean));
}

/**
 * Serialize date filter to URL params
 */
function serializeDateFilter(
  filters: SpreadsheetFilterState,
  params: URLSearchParams
): void {
  const { dateFilterPreset, dateFilterDate, dateFilterRange } = filters;

  switch (dateFilterPreset) {
    case 'specific-date':
      if (dateFilterDate) {
        params.set('date', 'specific');
        params.set('d', String(dateFilterDate));
      }
      break;
    case 'date-range':
      if (dateFilterRange) {
        params.set('date', 'range');
        params.set('start', String(dateFilterRange.start));
        params.set('end', String(dateFilterRange.end));
      }
      break;
    case 'today':
    case 'tomorrow':
    case 'yesterday':
    case 'this-week':
      params.set('date', dateFilterPreset);
      break;
    // 'all' and undefined don't need URL params
  }
}

/**
 * Serialize title filter to URL params
 */
function serializeTitleFilter(
  titleFilter: SpreadsheetFilterState['filters']['title'],
  params: URLSearchParams
): void {
  if (titleFilter?.type === 'text' && titleFilter.value.trim()) {
    params.set('title', titleFilter.value);
  } else if (titleFilter?.type === 'title-enhanced') {
    if (titleFilter.searchText.trim()) {
      params.set('title', titleFilter.searchText);
    }
    // Note: selectedTaskIds are not serialized to URL as they're transient state
  }
}

/**
 * Serialize column filters to URL params
 */
function serializeColumnFilters(
  filters: SpreadsheetFilterState,
  params: URLSearchParams
): void {
  const columnFilters = filters.filters;

  if (columnFilters.type?.type === 'multiselect') {
    const serialized = serializeMultiselect(columnFilters.type.selected);
    if (serialized) params.set('type', serialized);
  }

  if (columnFilters.assignee?.type === 'multiselect') {
    const serialized = serializeMultiselect(columnFilters.assignee.selected);
    if (serialized) params.set('assignee', serialized);
  }

  if (columnFilters.status?.type === 'multiselect') {
    const serialized = serializeMultiselect(columnFilters.status.selected);
    if (serialized) params.set('status', serialized);
  }

  if (columnFilters.importance?.type === 'multiselect') {
    const serialized = serializeMultiselect(columnFilters.importance.selected);
    if (serialized) params.set('importance', serialized);
  }

  serializeTitleFilter(columnFilters.title, params);

  if (
    columnFilters.dueDate?.type === 'date' &&
    columnFilters.dueDate.value !== null
  ) {
    params.set('dueDate', String(columnFilters.dueDate.value));
  }
}

/**
 * Convert filter state to URL search params
 */
export function serializeFiltersToParams(
  filters: SpreadsheetFilterState
): URLSearchParams {
  const params = new URLSearchParams();
  serializeDateFilter(filters, params);
  serializeColumnFilters(filters, params);
  return params;
}

/**
 * Parse date filter from URL params
 */
function parseDateFilter(
  params: URLSearchParams,
  result: Partial<SpreadsheetFilterState>
): void {
  const dateParam = params.get('date');
  if (dateParam === 'specific') {
    const d = params.get('d');
    if (d) {
      result.dateFilterPreset = 'specific-date';
      result.dateFilterDate = Number(d);
    }
  } else if (dateParam === 'range') {
    const start = params.get('start');
    const end = params.get('end');
    if (start && end) {
      result.dateFilterPreset = 'date-range';
      result.dateFilterRange = {
        start: Number(start),
        end: Number(end),
      } as DateRange;
    }
  } else if (dateParam) {
    const validPresets: DateFilterPreset[] = [
      'today',
      'tomorrow',
      'yesterday',
      'this-week',
      'all',
    ];
    if (validPresets.includes(dateParam as DateFilterPreset)) {
      result.dateFilterPreset = dateParam as DateFilterPreset;
    }
  }
}

/**
 * Parse column filters from URL params
 */
function parseColumnFilters(
  params: URLSearchParams,
  result: Partial<SpreadsheetFilterState>
): void {
  const typeParam = params.get('type');
  if (typeParam) {
    result.filters!.type = {
      type: 'multiselect',
      selected: parseMultiselect(typeParam),
    };
  }

  const assigneeParam = params.get('assignee');
  if (assigneeParam) {
    result.filters!.assignee = {
      type: 'multiselect',
      selected: parseMultiselect(assigneeParam),
    };
  }

  const statusParam = params.get('status');
  if (statusParam) {
    result.filters!.status = {
      type: 'multiselect',
      selected: parseMultiselect(statusParam),
    };
  }

  const importanceParam = params.get('importance');
  if (importanceParam) {
    result.filters!.importance = {
      type: 'multiselect',
      selected: parseMultiselect(importanceParam),
    };
  }

  const titleParam = params.get('title');
  if (titleParam) {
    result.filters!.title = {
      type: 'text',
      value: titleParam,
    };
  }

  const dueDateParam = params.get('dueDate');
  if (dueDateParam) {
    result.filters!.dueDate = {
      type: 'date',
      value: Number(dueDateParam),
    };
  }
}

/**
 * Parse URL search params back to filter state
 */
export function parseParamsToFilters(
  params: URLSearchParams
): Partial<SpreadsheetFilterState> {
  const result: Partial<SpreadsheetFilterState> = {
    filters: {
      type: null,
      assignee: null,
      title: null,
      status: null,
      importance: null,
      dueDate: null,
    },
  };

  parseDateFilter(params, result);
  parseColumnFilters(params, result);

  return result;
}

const STATIC_VIEW_PATHS: Partial<Record<ViewType, string>> = {
  'full-day-details': '/details',
  archive: '/archive',
  'crm-list': '/crm',
  'crm-new': '/crm/new',
  'wiki-list': '/wiki',
  dashboard: '/dashboard',
};

function getViewPath(
  view: ViewType,
  taskId?: string | null,
  contactId?: string | null,
  wikiPageId?: string | null
): string {
  const staticPath = STATIC_VIEW_PATHS[view];
  if (staticPath) return staticPath;

  if (view === 'task-detail') return taskId ? `/task/${taskId}` : '/';
  if (view === 'crm-detail')
    return contactId ? `/crm/contacts/${contactId}` : '/crm';
  if (view === 'wiki-page') return wikiPageId ? `/wiki/${wikiPageId}` : '/wiki';

  return '/';
}

/**
 * Build a URL path and search string from view state
 */
export function buildUrl(
  view: ViewType,
  taskId?: string | null,
  filters?: SpreadsheetFilterState,
  contactId?: string | null,
  wikiPageId?: string | null,
  groupBy?: GroupByMode
): string {
  const path = getViewPath(view, taskId, contactId, wikiPageId);

  // Only add query params for views that use them
  const useFilters = view === 'spreadsheet' || view === 'full-day-details';
  const useGroupBy = view === 'spreadsheet' || view === 'archive';

  if (useFilters || useGroupBy) {
    const params =
      useFilters && filters
        ? serializeFiltersToParams(filters)
        : new URLSearchParams();

    if (useGroupBy && groupBy && groupBy !== 'none') {
      params.set('groupBy', groupBy);
    }

    const search = params.toString();
    if (search) {
      return `${path}?${search}`;
    }
  }

  return path;
}

const STATIC_PATH_TO_VIEW: Record<string, ViewType> = {
  '/details': 'full-day-details',
  '/archive': 'archive',
  '/crm': 'crm-list',
  '/crm/new': 'crm-new',
  '/dashboard': 'dashboard',
  '/wiki': 'wiki-list',
};

function parsePathname(pathname: string, result: RouterState): void {
  const staticView = STATIC_PATH_TO_VIEW[pathname];
  if (staticView) {
    result.view = staticView;
    return;
  }

  if (pathname.startsWith('/task/')) {
    const taskId = pathname.slice(6);
    if (taskId) {
      result.view = 'task-detail';
      result.taskId = taskId;
    }
  } else if (pathname.startsWith('/crm/contacts/')) {
    const contactId = pathname.slice(14);
    if (contactId) {
      result.view = 'crm-detail';
      result.contactId = contactId;
    }
  } else if (pathname.startsWith('/wiki/')) {
    const wikiPageId = pathname.slice(6);
    if (wikiPageId) {
      result.view = 'wiki-page';
      result.wikiPageId = wikiPageId;
    }
  }
}

/**
 * Parse a URL path and search string into router state
 */
export function parseUrl(pathname: string, search: string): RouterState {
  const result: RouterState = {
    view: 'spreadsheet',
    taskId: null,
    contactId: null,
    wikiPageId: null,
    filters: {},
  };

  // Parse path
  parsePathname(pathname, result);

  // Parse search params for filters and groupBy
  if (search) {
    const params = new URLSearchParams(search);
    result.filters = parseParamsToFilters(params);

    const groupByParam = params.get('groupBy');
    const validGroupBy: GroupByMode[] = [
      'none',
      'date',
      'type',
      'status',
      'importance',
      'assignee',
    ];
    if (groupByParam && validGroupBy.includes(groupByParam as GroupByMode)) {
      result.groupBy = groupByParam as GroupByMode;
    }
  }

  return result;
}

/**
 * Merge partial filter state with defaults to create a complete SpreadsheetFilterState
 */
export function mergeWithDefaultFilters(
  partial: Partial<SpreadsheetFilterState>
): SpreadsheetFilterState {
  return {
    filters: {
      type: partial.filters?.type ?? null,
      assignee: partial.filters?.assignee ?? null,
      title: partial.filters?.title ?? null,
      status: partial.filters?.status ?? null,
      importance: partial.filters?.importance ?? null,
      dueDate: partial.filters?.dueDate ?? null,
    },
    dateFilterPreset: partial.dateFilterPreset ?? 'all',
    dateFilterDate: partial.dateFilterDate ?? null,
    dateFilterRange: partial.dateFilterRange ?? null,
  };
}
