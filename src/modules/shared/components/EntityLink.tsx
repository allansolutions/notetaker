/**
 * EntityLink Component
 *
 * Renders a clickable link to any entity in the system.
 * Displays the entity title with an icon based on type.
 */

import { CheckSquare, User, Building2, FileText, Loader2 } from 'lucide-react';
import type { EntityRef, EntityType } from '../types';
import { getEntityUrl } from '../types';
import { cn } from '@/lib/utils';

interface EntityLinkProps {
  /** Reference to the entity to link to */
  entityRef: EntityRef;
  /** Title to display (must be provided by parent - we don't fetch) */
  title: string;
  /** Whether to show the entity type icon */
  showIcon?: boolean;
  /** Whether the entity is loading */
  isLoading?: boolean;
  /** Callback when link is clicked */
  onClick?: () => void;
  /** Additional className */
  className?: string;
}

const ENTITY_ICONS: Record<
  EntityType,
  React.ComponentType<{ className?: string }>
> = {
  task: CheckSquare,
  contact: User,
  company: Building2,
  'wiki-page': FileText,
};

const ENTITY_LABELS: Record<EntityType, string> = {
  task: 'Task',
  contact: 'Contact',
  company: 'Company',
  'wiki-page': 'Page',
};

export function EntityLink({
  entityRef,
  title,
  showIcon = true,
  isLoading = false,
  onClick,
  className,
}: EntityLinkProps) {
  const Icon = ENTITY_ICONS[entityRef.type];
  const url = getEntityUrl(entityRef);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) {
      onClick();
    } else {
      // Default: navigate via window (will be enhanced with router integration)
      window.location.href = url;
    }
  };

  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Loading...</span>
      </span>
    );
  }

  return (
    <a
      href={url}
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-1 text-primary hover:underline cursor-pointer',
        className
      )}
      title={`${ENTITY_LABELS[entityRef.type]}: ${title}`}
    >
      {showIcon && <Icon className="w-3 h-3 shrink-0" />}
      <span className="truncate">{title}</span>
    </a>
  );
}

/** Get icon component for an entity type */
export function getEntityIcon(type: EntityType) {
  return ENTITY_ICONS[type];
}

/** Get label for an entity type */
export function getEntityLabel(type: EntityType) {
  return ENTITY_LABELS[type];
}
