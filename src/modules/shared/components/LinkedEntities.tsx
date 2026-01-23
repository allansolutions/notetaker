/**
 * LinkedEntities Component
 *
 * Displays all entities linked to/from a source entity.
 * Includes ability to add new links and remove existing ones.
 */

import { useState, useCallback } from 'react';
import { Plus, X, Link2, Loader2 } from 'lucide-react';
import type { EntityRef, SearchableEntity } from '../types';
import { useEntityLinks } from '../hooks/useEntityLinks';
import { EntityLink as EntityLinkComponent, getEntityIcon } from './EntityLink';
import { EntityPicker } from './EntityPicker';
import { cn } from '@/lib/utils';

interface LinkedEntitiesProps {
  /** The source entity to show links for */
  sourceRef: EntityRef;
  /** Available entities for the picker (from unified search) */
  availableEntities: SearchableEntity[];
  /** Callback to get entity title by ref (for rendering links) */
  getEntityTitle: (ref: EntityRef) => string | undefined;
  /** Callback when navigating to an entity */
  onNavigate?: (ref: EntityRef) => void;
  /** Whether to show backlinks (entities linking to this one) */
  showBacklinks?: boolean;
  /** Label for the links section */
  linksLabel?: string;
  /** Label for the backlinks section */
  backlinksLabel?: string;
  /** Additional className */
  className?: string;
}

export function LinkedEntities({
  sourceRef,
  availableEntities,
  getEntityTitle,
  onNavigate,
  showBacklinks = true,
  linksLabel = 'Linked Items',
  backlinksLabel = 'Linked From',
  className,
}: LinkedEntitiesProps) {
  const { links, backlinks, isLoading, error, addLink, removeLink } =
    useEntityLinks({ sourceRef });

  const [isPickerOpen, setPickerOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleAddLink = useCallback(
    async (targetRef: EntityRef) => {
      try {
        await addLink(targetRef);
      } catch {
        // Error handled by hook
      }
    },
    [addLink]
  );

  const handleRemoveLink = useCallback(
    async (linkId: string) => {
      setRemovingId(linkId);
      try {
        await removeLink(linkId);
      } catch {
        // Error handled by hook
      } finally {
        setRemovingId(null);
      }
    },
    [removeLink]
  );

  // Filter out entities that are already linked
  const linkedTargetIds = new Set(
    links.map((l) => `${l.targetType}-${l.targetId}`)
  );
  const availableForPicker = availableEntities.filter(
    (e) =>
      !linkedTargetIds.has(`${e.type}-${e.id}`) &&
      !(e.type === sourceRef.type && e.id === sourceRef.id)
  );

  if (isLoading) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 text-muted-foreground',
          className
        )}
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading links...</span>
      </div>
    );
  }

  const hasLinks = links.length > 0;
  const hasBacklinks = backlinks.length > 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Error message */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">
          {error}
        </div>
      )}

      {/* Outgoing links */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
            <Link2 className="w-3 h-3" />
            {linksLabel}
          </h4>
          <button
            onClick={() => setPickerOpen(true)}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>

        {hasLinks ? (
          <ul className="space-y-1">
            {links.map((link) => {
              const targetRef: EntityRef = {
                type: link.targetType,
                id: link.targetId,
              };
              const title = getEntityTitle(targetRef) ?? 'Unknown';
              const Icon = getEntityIcon(link.targetType);
              const isRemoving = removingId === link.id;

              return (
                <li
                  key={link.id}
                  className="flex items-center gap-2 group text-sm"
                >
                  <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
                  <EntityLinkComponent
                    entityRef={targetRef}
                    title={title}
                    showIcon={false}
                    onClick={() => onNavigate?.(targetRef)}
                    className="flex-1 truncate"
                  />
                  <button
                    onClick={() => handleRemoveLink(link.id)}
                    disabled={isRemoving}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity disabled:opacity-50"
                    title="Remove link"
                  >
                    {isRemoving ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <X className="w-3 h-3" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No linked items</p>
        )}
      </div>

      {/* Backlinks */}
      {showBacklinks && hasBacklinks && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1 mb-2">
            <Link2 className="w-3 h-3 rotate-180" />
            {backlinksLabel}
          </h4>
          <ul className="space-y-1">
            {backlinks.map((link) => {
              const sourceEntityRef: EntityRef = {
                type: link.sourceType,
                id: link.sourceId,
              };
              const title = getEntityTitle(sourceEntityRef) ?? 'Unknown';
              const Icon = getEntityIcon(link.sourceType);

              return (
                <li key={link.id} className="flex items-center gap-2 text-sm">
                  <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
                  <EntityLinkComponent
                    entityRef={sourceEntityRef}
                    title={title}
                    showIcon={false}
                    onClick={() => onNavigate?.(sourceEntityRef)}
                    className="flex-1 truncate"
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Entity picker popover */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-32">
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close picker"
            className="absolute inset-0 bg-black/20 cursor-default"
            onClick={() => setPickerOpen(false)}
          />
          {/* Picker */}
          <div className="relative">
            <EntityPicker
              entities={availableForPicker}
              onSelect={handleAddLink}
              onClose={() => setPickerOpen(false)}
              placeholder="Link to..."
            />
          </div>
        </div>
      )}
    </div>
  );
}
