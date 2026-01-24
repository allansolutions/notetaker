/**
 * Wiki Module
 *
 * Knowledge base and documentation functionality.
 */

export * from './types';
export { WikiProvider, useWiki, buildTree } from './context/WikiContext';

// Components
export { WikiTree } from './components/WikiTree';
export { WikiTreeItem } from './components/WikiTreeItem';
export { WikiBreadcrumbs } from './components/WikiBreadcrumbs';
export { WikiIconPicker } from './components/WikiIconPicker';
export { WikiPageHeader } from './components/WikiPageHeader';

// Views
export { WikiPageView } from './components/views/WikiPageView';
export { WikiListView } from './components/views/WikiListView';
