/**
 * CRM Module
 *
 * Contact and relationship management functionality.
 */

export * from './types';
export { CrmProvider, useCrm } from './context/CrmContext';
export { ContactListView } from './components/views/ContactListView';
export { ContactDetailView } from './components/views/ContactDetailView';
export { ContactForm } from './components/ContactForm';
export { CompanyAutocomplete } from './components/CompanyAutocomplete';
