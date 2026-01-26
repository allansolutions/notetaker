import { useState, useEffect, useCallback, useRef } from 'react';
import { ViewType } from '../types';
import { SpreadsheetFilterState } from '../components/views/SpreadsheetView';
import type { GroupByMode } from '../components/spreadsheet/TaskTable';
import {
  RouterState,
  parseUrl,
  buildUrl,
  mergeWithDefaultFilters,
} from '../utils/urlSerializer';

export interface UseUrlRouterOptions {
  onNavigate: (state: RouterState) => void;
}

export interface UseUrlRouterResult {
  navigate: (
    view: ViewType,
    params?: { taskId?: string; contactId?: string; wikiPageId?: string }
  ) => void;
  updateFilters: (filters: SpreadsheetFilterState) => void;
  updateGroupBy: (groupBy: GroupByMode) => void;
  currentState: RouterState;
}

/**
 * Custom hook that manages URL-based routing using the History API.
 *
 * - Parses current URL on mount and returns initial view state
 * - Provides navigate() to push new history entries
 * - Provides updateFilters() to replace current entry (no new history)
 * - Listens to popstate events and calls onNavigate callback
 */
export function useUrlRouter(options: UseUrlRouterOptions): UseUrlRouterResult {
  const { onNavigate } = options;
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;

  // Parse initial URL
  const [currentState, setCurrentState] = useState<RouterState>(() => {
    return parseUrl(window.location.pathname, window.location.search);
  });

  // Track current filters and groupBy for URL updates
  const filtersRef = useRef<SpreadsheetFilterState | null>(null);
  const groupByRef = useRef<GroupByMode>('none');

  // Navigate to a new view (pushState)
  const navigate = useCallback(
    (
      view: ViewType,
      params?: { taskId?: string; contactId?: string; wikiPageId?: string }
    ) => {
      const taskId = params?.taskId ?? null;
      const contactId = params?.contactId ?? null;
      const wikiPageId = params?.wikiPageId ?? null;

      // Build URL - include current filters and groupBy for views that use them
      const filters = filtersRef.current ?? undefined;
      const groupBy = groupByRef.current;
      const url = buildUrl(view, taskId, filters, contactId, wikiPageId, groupBy);

      // Update browser history
      window.history.pushState(
        { view, taskId, contactId, wikiPageId },
        '',
        url
      );

      // Update internal state
      const newState: RouterState = {
        view,
        taskId,
        contactId,
        wikiPageId,
        filters: filters ? { ...filters } : {},
      };
      setCurrentState(newState);
    },
    []
  );

  // Replace URL state without creating a new history entry
  const replaceUrl = useCallback(() => {
    const filters = filtersRef.current ?? undefined;
    const groupBy = groupByRef.current;
    const url = buildUrl(
      currentState.view,
      currentState.taskId,
      filters,
      currentState.contactId,
      currentState.wikiPageId,
      groupBy
    );
    window.history.replaceState(
      {
        view: currentState.view,
        taskId: currentState.taskId,
        contactId: currentState.contactId,
        wikiPageId: currentState.wikiPageId,
      },
      '',
      url
    );
  }, [
    currentState.view,
    currentState.taskId,
    currentState.contactId,
    currentState.wikiPageId,
  ]);

  // Update filters without creating new history entry (replaceState)
  const updateFilters = useCallback(
    (filters: SpreadsheetFilterState) => {
      filtersRef.current = filters;

      // Only update URL if current view uses filters
      if (
        currentState.view === 'spreadsheet' ||
        currentState.view === 'full-day-details'
      ) {
        replaceUrl();

        // Update internal state
        setCurrentState((prev) => ({
          ...prev,
          filters: { ...filters },
        }));
      }
    },
    [currentState.view, replaceUrl]
  );

  // Update groupBy without creating new history entry (replaceState)
  const updateGroupBy = useCallback(
    (groupBy: GroupByMode) => {
      groupByRef.current = groupBy;

      if (
        currentState.view === 'spreadsheet' ||
        currentState.view === 'archive'
      ) {
        replaceUrl();

        setCurrentState((prev) => ({
          ...prev,
          groupBy,
        }));
      }
    },
    [currentState.view, replaceUrl]
  );

  // Listen to popstate events (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const newState = parseUrl(
        window.location.pathname,
        window.location.search
      );
      setCurrentState(newState);
      onNavigateRef.current(newState);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return {
    navigate,
    updateFilters,
    updateGroupBy,
    currentState,
  };
}

/**
 * Get initial router state from URL without using React hooks.
 * Useful for initializing state before first render.
 */
export function getInitialRouterState(): RouterState {
  return parseUrl(window.location.pathname, window.location.search);
}

/**
 * Convert router state filters to a complete SpreadsheetFilterState
 */
export function routerFiltersToState(
  filters: Partial<SpreadsheetFilterState>
): SpreadsheetFilterState {
  return mergeWithDefaultFilters(filters);
}
