/**
 * useEntityLinks Hook
 *
 * Manages CRUD operations for entity links.
 * Provides methods to link/unlink entities and fetch links.
 */

import { useState, useCallback, useEffect } from 'react';
import { entityLinkApi, ApiEntityLink } from '@/api/client';
import type { EntityRef, EntityLink } from '../types';

interface UseEntityLinksOptions {
  /** The source entity to manage links for */
  sourceRef: EntityRef;
  /** Whether to fetch links immediately on mount */
  fetchOnMount?: boolean;
}

interface UseEntityLinksResult {
  /** Links from the source entity */
  links: EntityLink[];
  /** Links pointing to the source entity (backlinks) */
  backlinks: EntityLink[];
  /** Whether links are currently loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Add a link to another entity */
  addLink: (targetRef: EntityRef) => Promise<void>;
  /** Remove a link by ID */
  removeLink: (linkId: string) => Promise<void>;
  /** Refresh links from server */
  refresh: () => Promise<void>;
}

function apiToEntityLink(api: ApiEntityLink): EntityLink {
  return {
    id: api.id,
    sourceType: api.sourceType,
    sourceId: api.sourceId,
    targetType: api.targetType,
    targetId: api.targetId,
    createdAt: api.createdAt,
  };
}

export function useEntityLinks({
  sourceRef,
  fetchOnMount = true,
}: UseEntityLinksOptions): UseEntityLinksResult {
  const [links, setLinks] = useState<EntityLink[]>([]);
  const [backlinks, setBacklinks] = useState<EntityLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fromSource, toTarget] = await Promise.all([
        entityLinkApi.getFromSource(sourceRef.type, sourceRef.id),
        entityLinkApi.getToTarget(sourceRef.type, sourceRef.id),
      ]);
      setLinks(fromSource.map(apiToEntityLink));
      setBacklinks(toTarget.map(apiToEntityLink));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch links');
    } finally {
      setIsLoading(false);
    }
  }, [sourceRef.type, sourceRef.id]);

  useEffect(() => {
    if (fetchOnMount) {
      fetchLinks();
    }
  }, [fetchOnMount, fetchLinks]);

  const addLink = useCallback(
    async (targetRef: EntityRef) => {
      try {
        setError(null);
        const apiLink = await entityLinkApi.create({
          sourceType: sourceRef.type,
          sourceId: sourceRef.id,
          targetType: targetRef.type,
          targetId: targetRef.id,
        });
        setLinks((prev) => [...prev, apiToEntityLink(apiLink)]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add link');
        throw err;
      }
    },
    [sourceRef.type, sourceRef.id]
  );

  const removeLink = useCallback(async (linkId: string) => {
    try {
      setError(null);
      await entityLinkApi.delete(linkId);
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
      setBacklinks((prev) => prev.filter((l) => l.id !== linkId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove link');
      throw err;
    }
  }, []);

  return {
    links,
    backlinks,
    isLoading,
    error,
    addLink,
    removeLink,
    refresh: fetchLinks,
  };
}
