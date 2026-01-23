/**
 * Cross-module entity reference and linking types
 *
 * These types enable any entity in any module to link to any other entity,
 * providing a flexible, generic linking system.
 */

/** Available entity types across all modules */
export type EntityType = 'task' | 'contact' | 'company' | 'wiki-page';

/** Module that owns an entity type */
export type Module = 'tasks' | 'crm' | 'wiki';

/** Reference to any entity in the system */
export interface EntityRef {
  type: EntityType;
  id: string;
}

/** A link between two entities */
export interface EntityLink {
  id: string;
  sourceType: EntityType;
  sourceId: string;
  targetType: EntityType;
  targetId: string;
  createdAt: number;
}

/** Resolved entity with display information for rendering */
export interface ResolvedEntity {
  ref: EntityRef;
  title: string;
  subtitle?: string;
  url: string;
  module: Module;
}

/** Entity that can be indexed for unified search */
export interface SearchableEntity {
  id: string;
  type: EntityType;
  title: string;
  subtitle?: string;
  keywords?: string[];
  module: Module;
  url: string;
}

/** Map entity types to their modules */
export const ENTITY_TYPE_TO_MODULE: Record<EntityType, Module> = {
  task: 'tasks',
  contact: 'crm',
  company: 'crm',
  'wiki-page': 'wiki',
};

/** Get module for an entity type */
export function getModuleForEntityType(type: EntityType): Module {
  return ENTITY_TYPE_TO_MODULE[type];
}

/** Build URL for an entity reference */
export function getEntityUrl(ref: EntityRef): string {
  switch (ref.type) {
    case 'task':
      return `/tasks/${ref.id}`;
    case 'contact':
      return `/crm/contacts/${ref.id}`;
    case 'company':
      return `/crm/companies/${ref.id}`;
    case 'wiki-page':
      return `/wiki/${ref.id}`;
  }
}

/** Check if two entity refs are equal */
export function entityRefsEqual(a: EntityRef, b: EntityRef): boolean {
  return a.type === b.type && a.id === b.id;
}
