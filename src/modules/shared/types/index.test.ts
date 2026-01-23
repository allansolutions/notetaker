import { describe, it, expect } from 'vitest';
import {
  getModuleForEntityType,
  getEntityUrl,
  entityRefsEqual,
  ENTITY_TYPE_TO_MODULE,
} from './index';

describe('ENTITY_TYPE_TO_MODULE', () => {
  it('maps task to tasks module', () => {
    expect(ENTITY_TYPE_TO_MODULE.task).toBe('tasks');
  });

  it('maps contact to crm module', () => {
    expect(ENTITY_TYPE_TO_MODULE.contact).toBe('crm');
  });

  it('maps company to crm module', () => {
    expect(ENTITY_TYPE_TO_MODULE.company).toBe('crm');
  });

  it('maps wiki-page to wiki module', () => {
    expect(ENTITY_TYPE_TO_MODULE['wiki-page']).toBe('wiki');
  });
});

describe('getModuleForEntityType', () => {
  it('returns tasks for task type', () => {
    expect(getModuleForEntityType('task')).toBe('tasks');
  });

  it('returns crm for contact type', () => {
    expect(getModuleForEntityType('contact')).toBe('crm');
  });

  it('returns crm for company type', () => {
    expect(getModuleForEntityType('company')).toBe('crm');
  });

  it('returns wiki for wiki-page type', () => {
    expect(getModuleForEntityType('wiki-page')).toBe('wiki');
  });
});

describe('getEntityUrl', () => {
  it('builds URL for task', () => {
    expect(getEntityUrl({ type: 'task', id: 'task-123' })).toBe(
      '/tasks/task-123'
    );
  });

  it('builds URL for contact', () => {
    expect(getEntityUrl({ type: 'contact', id: 'contact-456' })).toBe(
      '/crm/contacts/contact-456'
    );
  });

  it('builds URL for company', () => {
    expect(getEntityUrl({ type: 'company', id: 'company-789' })).toBe(
      '/crm/companies/company-789'
    );
  });

  it('builds URL for wiki-page', () => {
    expect(getEntityUrl({ type: 'wiki-page', id: 'page-abc' })).toBe(
      '/wiki/page-abc'
    );
  });
});

describe('entityRefsEqual', () => {
  it('returns true for equal refs', () => {
    expect(
      entityRefsEqual(
        { type: 'task', id: 'task-123' },
        { type: 'task', id: 'task-123' }
      )
    ).toBe(true);
  });

  it('returns false for different types', () => {
    expect(
      entityRefsEqual(
        { type: 'task', id: 'task-123' },
        { type: 'contact', id: 'task-123' }
      )
    ).toBe(false);
  });

  it('returns false for different ids', () => {
    expect(
      entityRefsEqual(
        { type: 'task', id: 'task-123' },
        { type: 'task', id: 'task-456' }
      )
    ).toBe(false);
  });

  it('returns false for completely different refs', () => {
    expect(
      entityRefsEqual(
        { type: 'task', id: 'task-123' },
        { type: 'company', id: 'company-456' }
      )
    ).toBe(false);
  });
});
