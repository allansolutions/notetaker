/**
 * SearchContext
 *
 * Provides unified search functionality across all modules.
 * Uses MiniSearch for fast, client-side full-text search.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  ReactNode,
} from 'react';
import MiniSearch from 'minisearch';
import type {
  SearchableEntity,
  EntityType,
  Module,
} from '@/modules/shared/types';

interface SearchResult extends SearchableEntity {
  score: number;
}

interface SearchContextType {
  /** Search for entities matching a query */
  search: (query: string, options?: SearchOptions) => SearchResult[];
  /** Register entities from a module */
  registerEntities: (module: Module, entities: SearchableEntity[]) => void;
  /** Unregister all entities from a module */
  unregisterModule: (module: Module) => void;
  /** Get all registered entities */
  getAllEntities: () => SearchableEntity[];
  /** Check if entities are registered */
  hasEntities: boolean;
}

interface SearchOptions {
  /** Filter by entity types */
  types?: EntityType[];
  /** Maximum number of results */
  limit?: number;
  /** Whether to use fuzzy matching */
  fuzzy?: boolean;
}

const SearchContext = createContext<SearchContextType | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  // Store entities by module for easy registration/unregistration
  const [entitiesByModule, setEntitiesByModule] = useState<
    Map<Module, SearchableEntity[]>
  >(new Map());

  // Create MiniSearch instance
  const searchIndex = useMemo(
    () =>
      new MiniSearch<SearchableEntity>({
        fields: ['title', 'subtitle', 'keywords'],
        storeFields: [
          'id',
          'type',
          'title',
          'subtitle',
          'module',
          'url',
          'keywords',
        ],
        searchOptions: {
          prefix: true,
          boost: { title: 2 },
        },
      }),
    []
  );

  // Rebuild index when entities change
  useEffect(() => {
    searchIndex.removeAll();
    const allEntities: SearchableEntity[] = [];
    entitiesByModule.forEach((entities) => {
      allEntities.push(...entities);
    });
    if (allEntities.length > 0) {
      searchIndex.addAll(allEntities);
    }
  }, [entitiesByModule, searchIndex]);

  const registerEntities = useCallback(
    (module: Module, entities: SearchableEntity[]) => {
      setEntitiesByModule((prev) => {
        const next = new Map(prev);
        next.set(module, entities);
        return next;
      });
    },
    []
  );

  const unregisterModule = useCallback((module: Module) => {
    setEntitiesByModule((prev) => {
      const next = new Map(prev);
      next.delete(module);
      return next;
    });
  }, []);

  const getAllEntities = useCallback(() => {
    const all: SearchableEntity[] = [];
    entitiesByModule.forEach((entities) => {
      all.push(...entities);
    });
    return all;
  }, [entitiesByModule]);

  const search = useCallback(
    (query: string, options?: SearchOptions): SearchResult[] => {
      if (!query.trim()) {
        return [];
      }

      const searchOptions: Parameters<typeof searchIndex.search>[1] = {
        prefix: true,
        fuzzy: options?.fuzzy ? 0.2 : false,
      };

      const rawResults = searchIndex.search(query, searchOptions);

      // Map MiniSearch results to our SearchResult type
      // MiniSearch stores fields we specified in storeFields
      let results: SearchResult[] = rawResults.map((result) => ({
        id: result.id as string,
        type: result.type as EntityType,
        title: result.title as string,
        subtitle: result.subtitle as string | undefined,
        module: result.module as Module,
        url: result.url as string,
        keywords: result.keywords as string[] | undefined,
        score: result.score,
      }));

      // Filter by types if specified
      if (options?.types && options.types.length > 0) {
        results = results.filter((r) => options.types!.includes(r.type));
      }

      // Limit results
      if (options?.limit) {
        results = results.slice(0, options.limit);
      }

      return results;
    },
    [searchIndex]
  );

  const hasEntities = useMemo(() => {
    let count = 0;
    entitiesByModule.forEach((entities) => {
      count += entities.length;
    });
    return count > 0;
  }, [entitiesByModule]);

  return (
    <SearchContext.Provider
      value={{
        search,
        registerEntities,
        unregisterModule,
        getAllEntities,
        hasEntities,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}
