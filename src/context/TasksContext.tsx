/**
 * Re-export TasksContext from the tasks module for backwards compatibility.
 * New code should import directly from '@/modules/tasks/context/TasksContext'.
 */
export { TasksProvider, useTasks } from '@/modules/tasks/context/TasksContext';
