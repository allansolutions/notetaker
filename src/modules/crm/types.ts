/**
 * CRM Module Types
 *
 * Types for contact and relationship management.
 */

export interface Company {
  id: string;
  name: string;
  street?: string;
  city?: string;
  country?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  linkedIn?: string;
  instagram?: string;
  street?: string;
  city?: string;
  country?: string;
  companyId?: string;
  company?: Company | null;
  createdAt: number;
  updatedAt: number;
}

export type CrmViewType = 'crm-list' | 'crm-new' | 'crm-detail';
