/**
 * Shared Module
 *
 * Cross-module shared types, components, hooks, and utilities.
 */

// Types
export * from './types';

// Components
export {
  EntityLink,
  getEntityIcon,
  getEntityLabel,
} from './components/EntityLink';
export { EntityPicker } from './components/EntityPicker';
export { LinkedEntities } from './components/LinkedEntities';

// Hooks
export { useEntityLinks } from './hooks/useEntityLinks';
