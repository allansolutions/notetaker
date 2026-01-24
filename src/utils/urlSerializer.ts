import { ViewType, DateFilterPreset, DateRange } from '../types';
import { SpreadsheetFilterState } from '../components/views/SpreadsheetView';

export interface RouterState {
  view: ViewType;
  taskId: string | null;
  contactId: string | null;
  wikiPageId: string | null;
  filters: Partial<SpreadsheetFilterState>;
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

/**
 * Build a URL path and search string from view state
 */
export function buildUrl(
  view: ViewType,
  taskId?: string | null,
  filters?: SpreadsheetFilterState,
  contactId?: string | null,
  wikiPageId?: string | null
): string {
  let path: string;

  switch (view) {
    case 'task-detail':
      path = taskId ? `/task/${taskId}` : '/';
      break;
    case 'full-day-details':
      path = '/details';
      break;
    case 'archive':
      path = '/archive';
      break;
    case 'crm-list':
      path = '/crm';
      break;
    case 'crm-new':
      path = '/crm/new';
      break;
    case 'crm-detail':
      path = contactId ? `/crm/contacts/${contactId}` : '/crm';
      break;
    case 'wiki-list':
      path = '/wiki';
      break;
    case 'wiki-page':
      path = wikiPageId ? `/wiki/${wikiPageId}` : '/wiki';
      break;
    case 'spreadsheet':
    default:
      path = '/';
      break;
  }

  // Only add filters for views that use them
  if (filters && (view === 'spreadsheet' || view === 'full-day-details')) {
    const params = serializeFiltersToParams(filters);
    const search = params.toString();
    if (search) {
      return `${path}?${search}`;
    }
  }

  return path;
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
  if (pathname === '/details') {
    result.view = 'full-day-details';
  } else if (pathname === '/archive') {
    result.view = 'archive';
  } else if (pathname.startsWith('/task/')) {
    const taskId = pathname.slice(6); // Remove '/task/'
    if (taskId) {
      result.view = 'task-detail';
      result.taskId = taskId;
    }
  } else if (pathname === '/crm') {
    result.view = 'crm-list';
  } else if (pathname === '/crm/new') {
    result.view = 'crm-new';
  } else if (pathname.startsWith('/crm/contacts/')) {
    const contactId = pathname.slice(14); // Remove '/crm/contacts/'
    if (contactId) {
      result.view = 'crm-detail';
      result.contactId = contactId;
    }
  } else if (pathname === '/wiki') {
    result.view = 'wiki-list';
  } else if (pathname.startsWith('/wiki/')) {
    const wikiPageId = pathname.slice(6); // Remove '/wiki/'
    if (wikiPageId) {
      result.view = 'wiki-page';
      result.wikiPageId = wikiPageId;
    }
  }
  // Default: spreadsheet (for '/' or any unmatched path)

  // Parse search params for filters
  if (search) {
    const params = new URLSearchParams(search);
    result.filters = parseParamsToFilters(params);
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
