import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useUrlRouter,
  getInitialRouterState,
  routerFiltersToState,
} from './useUrlRouter';
import { SpreadsheetFilterState } from '../components/views/SpreadsheetView';

// Mock History API
const mockPushState = vi.fn();
const mockReplaceState = vi.fn();
const originalHistory = window.history;

// Helper to set window.location
function setLocation(pathname: string, search: string = '') {
  Object.defineProperty(window, 'location', {
    value: {
      pathname,
      search,
      href: `http://localhost${pathname}${search}`,
    },
    writable: true,
    configurable: true,
  });
}

describe('useUrlRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setLocation('/', '');

    Object.defineProperty(window, 'history', {
      value: {
        pushState: mockPushState,
        replaceState: mockReplaceState,
        back: vi.fn(),
        forward: vi.fn(),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'history', {
      value: originalHistory,
      writable: true,
      configurable: true,
    });
  });

  it('parses initial URL on mount', () => {
    setLocation('/task/task-123', '');
    const onNavigate = vi.fn();

    const { result } = renderHook(() => useUrlRouter({ onNavigate }));

    expect(result.current.currentState.view).toBe('task-detail');
    expect(result.current.currentState.taskId).toBe('task-123');
  });

  it('parses initial URL with filters', () => {
    setLocation('/', '?date=today&type=admin');
    const onNavigate = vi.fn();

    const { result } = renderHook(() => useUrlRouter({ onNavigate }));

    expect(result.current.currentState.view).toBe('spreadsheet');
    expect(result.current.currentState.filters.dateFilterPreset).toBe('today');
  });

  describe('navigate', () => {
    it('pushes new history entry when navigating', () => {
      const onNavigate = vi.fn();
      const { result } = renderHook(() => useUrlRouter({ onNavigate }));

      act(() => {
        result.current.navigate('task-detail', { taskId: 'task-456' });
      });

      expect(mockPushState).toHaveBeenCalledWith(
        {
          view: 'task-detail',
          taskId: 'task-456',
          contactId: null,
          wikiPageId: null,
        },
        '',
        '/task/task-456'
      );
      expect(result.current.currentState.view).toBe('task-detail');
      expect(result.current.currentState.taskId).toBe('task-456');
    });

    it('navigates to spreadsheet view', () => {
      setLocation('/task/task-123', '');
      const onNavigate = vi.fn();
      const { result } = renderHook(() => useUrlRouter({ onNavigate }));

      act(() => {
        result.current.navigate('spreadsheet');
      });

      expect(mockPushState).toHaveBeenCalledWith(
        {
          view: 'spreadsheet',
          taskId: null,
          contactId: null,
          wikiPageId: null,
        },
        '',
        '/'
      );
    });

    it('navigates to details view', () => {
      const onNavigate = vi.fn();
      const { result } = renderHook(() => useUrlRouter({ onNavigate }));

      act(() => {
        result.current.navigate('full-day-details');
      });

      expect(mockPushState).toHaveBeenCalledWith(
        {
          view: 'full-day-details',
          taskId: null,
          contactId: null,
          wikiPageId: null,
        },
        '',
        '/details'
      );
    });

    it('navigates to archive view', () => {
      const onNavigate = vi.fn();
      const { result } = renderHook(() => useUrlRouter({ onNavigate }));

      act(() => {
        result.current.navigate('archive');
      });

      expect(mockPushState).toHaveBeenCalledWith(
        { view: 'archive', taskId: null, contactId: null, wikiPageId: null },
        '',
        '/archive'
      );
    });

    it('includes filters when navigating to spreadsheet', () => {
      const onNavigate = vi.fn();
      const { result } = renderHook(() => useUrlRouter({ onNavigate }));

      const filters: SpreadsheetFilterState = {
        filters: {
          type: { type: 'multiselect', selected: new Set(['admin']) },
          title: null,
          status: null,
          importance: null,
          dueDate: null,
        },
        dateFilterPreset: 'today',
        dateFilterDate: null,
        dateFilterRange: null,
      };

      act(() => {
        result.current.updateFilters(filters);
      });

      act(() => {
        result.current.navigate('spreadsheet');
      });

      expect(mockPushState).toHaveBeenLastCalledWith(
        {
          view: 'spreadsheet',
          taskId: null,
          contactId: null,
          wikiPageId: null,
        },
        '',
        '/?date=today&type=admin'
      );
    });
  });

  describe('updateFilters', () => {
    it('uses replaceState instead of pushState', () => {
      const onNavigate = vi.fn();
      const { result } = renderHook(() => useUrlRouter({ onNavigate }));

      const filters: SpreadsheetFilterState = {
        filters: {
          type: null,
          title: null,
          status: null,
          importance: null,
          dueDate: null,
        },
        dateFilterPreset: 'today',
        dateFilterDate: null,
        dateFilterRange: null,
      };

      act(() => {
        result.current.updateFilters(filters);
      });

      expect(mockReplaceState).toHaveBeenCalled();
      expect(mockPushState).not.toHaveBeenCalled();
    });

    it('updates URL with new filters', () => {
      const onNavigate = vi.fn();
      const { result } = renderHook(() => useUrlRouter({ onNavigate }));

      const filters: SpreadsheetFilterState = {
        filters: {
          type: { type: 'multiselect', selected: new Set(['admin']) },
          title: { type: 'text', value: 'search' },
          status: null,
          importance: null,
          dueDate: null,
        },
        dateFilterPreset: 'this-week',
        dateFilterDate: null,
        dateFilterRange: null,
      };

      act(() => {
        result.current.updateFilters(filters);
      });

      expect(mockReplaceState).toHaveBeenCalledWith(
        {
          view: 'spreadsheet',
          taskId: null,
          contactId: null,
          wikiPageId: null,
        },
        '',
        '/?date=this-week&type=admin&title=search'
      );
    });

    it('does not update URL for task-detail view', () => {
      setLocation('/task/task-123', '');
      const onNavigate = vi.fn();
      const { result } = renderHook(() => useUrlRouter({ onNavigate }));

      const filters: SpreadsheetFilterState = {
        filters: {
          type: null,
          title: null,
          status: null,
          importance: null,
          dueDate: null,
        },
        dateFilterPreset: 'today',
        dateFilterDate: null,
        dateFilterRange: null,
      };

      act(() => {
        result.current.updateFilters(filters);
      });

      expect(mockReplaceState).not.toHaveBeenCalled();
    });

    it('updates URL for details view', () => {
      setLocation('/details', '');
      const onNavigate = vi.fn();
      const { result } = renderHook(() => useUrlRouter({ onNavigate }));

      const filters: SpreadsheetFilterState = {
        filters: {
          type: null,
          title: null,
          status: null,
          importance: null,
          dueDate: null,
        },
        dateFilterPreset: 'today',
        dateFilterDate: null,
        dateFilterRange: null,
      };

      act(() => {
        result.current.updateFilters(filters);
      });

      expect(mockReplaceState).toHaveBeenCalledWith(
        {
          view: 'full-day-details',
          taskId: null,
          contactId: null,
          wikiPageId: null,
        },
        '',
        '/details?date=today'
      );
    });
  });

  describe('popstate handling', () => {
    it('calls onNavigate when popstate fires', () => {
      const onNavigate = vi.fn();
      renderHook(() => useUrlRouter({ onNavigate }));

      // Simulate browser back/forward
      setLocation('/task/task-789', '');
      act(() => {
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      expect(onNavigate).toHaveBeenCalledWith({
        view: 'task-detail',
        taskId: 'task-789',
        contactId: null,
        wikiPageId: null,
        filters: {},
      });
    });

    it('updates currentState on popstate', () => {
      const onNavigate = vi.fn();
      const { result } = renderHook(() => useUrlRouter({ onNavigate }));

      setLocation('/details', '?date=today');
      act(() => {
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      expect(result.current.currentState.view).toBe('full-day-details');
      expect(result.current.currentState.filters.dateFilterPreset).toBe(
        'today'
      );
    });

    it('cleans up popstate listener on unmount', () => {
      const onNavigate = vi.fn();
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useUrlRouter({ onNavigate }));
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'popstate',
        expect.any(Function)
      );
      removeEventListenerSpy.mockRestore();
    });
  });
});

describe('getInitialRouterState', () => {
  beforeEach(() => {
    setLocation('/', '');
  });

  it('returns router state without using hooks', () => {
    setLocation('/archive', '');
    const state = getInitialRouterState();
    expect(state.view).toBe('archive');
  });

  it('parses filters from URL', () => {
    setLocation('/', '?date=today');
    const state = getInitialRouterState();
    expect(state.filters.dateFilterPreset).toBe('today');
  });
});

describe('routerFiltersToState', () => {
  it('merges partial filters with defaults', () => {
    const partial = {
      dateFilterPreset: 'today' as const,
    };
    const state = routerFiltersToState(partial);

    expect(state.dateFilterPreset).toBe('today');
    expect(state.dateFilterDate).toBeNull();
    expect(state.filters.type).toBeNull();
  });

  it('preserves provided filter values', () => {
    const partial = {
      filters: {
        type: { type: 'multiselect' as const, selected: new Set(['admin']) },
        title: null,
        status: null,
        importance: null,
        dueDate: null,
      },
    };
    const state = routerFiltersToState(partial);

    expect(state.filters.type).toEqual({
      type: 'multiselect',
      selected: new Set(['admin']),
    });
  });
});
