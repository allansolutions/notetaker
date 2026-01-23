/**
 * App-level types for routing and navigation
 */

import type {
  ViewType,
  DateFilterPreset,
  DateRange,
} from '@/modules/tasks/types';

/** Available application modules */
export type Module = 'tasks' | 'crm' | 'wiki' | 'settings';

/** Module-aware router state */
export interface ModuleRouterState {
  module: Module;
  view: string;
  entityId: string | null;
  filters: Record<string, unknown>;
}

/** Tasks module views (preserving existing ViewType) */
export type TasksView = ViewType;

/** CRM module views */
export type CrmView =
  | 'contacts'
  | 'contact-detail'
  | 'companies'
  | 'company-detail';

/** Wiki module views */
export type WikiView = 'pages' | 'page-detail' | 'page-tree';

/** Legacy router state for backwards compatibility */
export interface LegacyRouterState {
  view: ViewType;
  taskId: string | null;
  filters: {
    dateFilterPreset?: DateFilterPreset;
    dateFilterDate?: number | null;
    dateFilterRange?: DateRange | null;
    filters?: Record<string, unknown>;
  };
}

/** Convert module router state to legacy state for backwards compatibility */
export function toLegacyRouterState(
  state: ModuleRouterState
): LegacyRouterState {
  return {
    view: state.view as ViewType,
    taskId: state.entityId,
    filters: state.filters as LegacyRouterState['filters'],
  };
}

/** Convert legacy router state to module router state */
export function toModuleRouterState(
  state: LegacyRouterState
): ModuleRouterState {
  return {
    module: 'tasks',
    view: state.view,
    entityId: state.taskId,
    filters: state.filters,
  };
}

/** Parse module from URL path */
export function parseModuleFromPath(pathname: string): Module {
  if (pathname.startsWith('/crm')) return 'crm';
  if (pathname.startsWith('/wiki')) return 'wiki';
  if (pathname.startsWith('/settings')) return 'settings';
  // Default to tasks for /, /tasks, /task/:id, /details, /archive
  return 'tasks';
}

/** Build module-prefixed URL path */
export function buildModulePath(module: Module, subPath: string = ''): string {
  // Tasks uses root paths for backwards compatibility
  if (module === 'tasks') {
    return subPath || '/';
  }
  return `/${module}${subPath}`;
}
