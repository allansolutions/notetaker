/**
 * Tasks Module
 *
 * Re-exports all task-related functionality from existing locations.
 * This provides a clean module interface while maintaining backwards compatibility.
 */

// Types
export * from './types';

// Context
export { TasksProvider, useTasks } from './context/TasksContext';

// Hooks - re-export from existing locations
export { useTimeTracking } from '@/hooks/useTimeTracking';
export { useDateFilter } from '@/hooks/useDateFilter';
export { useTaskSearchIndex } from '@/hooks/useTaskSearchIndex';

// Utils - re-export from existing locations
export * from '@/utils/task-operations';
export * from '@/utils/filter-matching';
export * from '@/utils/date-filters';

// Components will be re-exported as they are migrated
