/**
 * EntityPicker Component
 *
 * Universal entity selector with search functionality.
 * Allows users to search and select any entity to link to.
 */

import { useState, useCallback, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import type { EntityRef, EntityType, SearchableEntity } from '../types';
import { getEntityIcon, getEntityLabel } from './EntityLink';

interface EntityPickerProps {
  /** Entity types to allow selection from */
  allowedTypes?: EntityType[];
  /** Callback when an entity is selected */
  onSelect: (ref: EntityRef) => void;
  /** Callback to close the picker */
  onClose: () => void;
  /** Searchable entities to pick from */
  entities: SearchableEntity[];
  /** Placeholder text */
  placeholder?: string;
}

export function EntityPicker({
  allowedTypes,
  onSelect,
  onClose,
  entities,
  placeholder = 'Search entities...',
}: EntityPickerProps) {
  const [query, setQuery] = useState('');

  const filteredEntities = useMemo(() => {
    let result = entities;

    // Filter by allowed types
    if (allowedTypes && allowedTypes.length > 0) {
      result = result.filter((e) => allowedTypes.includes(e.type));
    }

    // Filter by search query
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(lowerQuery) ||
          e.subtitle?.toLowerCase().includes(lowerQuery) ||
          e.keywords?.some((k) => k.toLowerCase().includes(lowerQuery))
      );
    }

    return result.slice(0, 20); // Limit results
  }, [entities, allowedTypes, query]);

  const handleSelect = useCallback(
    (entity: SearchableEntity) => {
      onSelect({ type: entity.type, id: entity.id });
      onClose();
    },
    [onSelect, onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg w-80 overflow-hidden">
      {/* Search input */}
      <div className="flex items-center gap-2 p-2 border-b border-border">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          ref={(el) => el?.focus()}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
        />
        <button
          onClick={onClose}
          className="p-1 hover:bg-accent rounded transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Results list */}
      <div className="max-h-64 overflow-y-auto">
        {filteredEntities.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {query ? 'No matching entities found' : 'Start typing to search'}
          </div>
        ) : (
          <ul className="py-1">
            {filteredEntities.map((entity) => {
              const Icon = getEntityIcon(entity.type);
              return (
                <li key={`${entity.type}-${entity.id}`}>
                  <button
                    onClick={() => handleSelect(entity)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent text-left transition-colors"
                  >
                    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {entity.title}
                      </div>
                      {entity.subtitle && (
                        <div className="text-xs text-muted-foreground truncate">
                          {entity.subtitle}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {getEntityLabel(entity.type)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
