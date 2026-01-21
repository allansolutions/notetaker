import { useState, useEffect, useCallback, useRef } from 'react';
import { ViewType } from '../types';
import { SpreadsheetFilterState } from '../components/views/SpreadsheetView';
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
  navigate: (view: ViewType, params?: { taskId?: string }) => void;
  updateFilters: (filters: SpreadsheetFilterState) => void;
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

  // Track current filters for updateFilters
  const filtersRef = useRef<SpreadsheetFilterState | null>(null);

  // Navigate to a new view (pushState)
  const navigate = useCallback(
    (view: ViewType, params?: { taskId?: string }) => {
      const taskId = params?.taskId ?? null;

      // Build URL - include current filters for views that use them
      const filters = filtersRef.current ?? undefined;
      const url = buildUrl(view, taskId, filters);

      // Update browser history
      window.history.pushState({ view, taskId }, '', url);

      // Update internal state
      const newState: RouterState = {
        view,
        taskId,
        filters: filters ? { ...filters } : {},
      };
      setCurrentState(newState);
    },
    []
  );

  // Update filters without creating new history entry (replaceState)
  const updateFilters = useCallback(
    (filters: SpreadsheetFilterState) => {
      filtersRef.current = filters;

      // Only update URL if current view uses filters
      if (
        currentState.view === 'spreadsheet' ||
        currentState.view === 'full-day-notes'
      ) {
        const url = buildUrl(currentState.view, currentState.taskId, filters);
        window.history.replaceState(
          { view: currentState.view, taskId: currentState.taskId },
          '',
          url
        );

        // Update internal state
        setCurrentState((prev) => ({
          ...prev,
          filters: { ...filters },
        }));
      }
    },
    [currentState.view, currentState.taskId]
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
