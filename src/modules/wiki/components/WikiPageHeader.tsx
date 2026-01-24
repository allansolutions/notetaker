import { useState, useCallback, useRef, useEffect } from 'react';
import { WikiIconPicker } from './WikiIconPicker';
import type { WikiPageType, WikiCategory } from '../types';

interface WikiPageHeaderProps {
  title: string;
  icon: string | null;
  type: WikiPageType | null;
  category: WikiCategory | null;
  onTitleChange: (title: string) => void;
  onIconChange: (icon: string | null) => void;
  onTypeChange: (type: WikiPageType | null) => void;
  onCategoryChange: (category: WikiCategory | null) => void;
}

const PAGE_TYPES: { value: WikiPageType; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'call-notes', label: 'Call Notes' },
  { value: 'sop', label: 'SOP' },
  { value: 'meeting-notes', label: 'Meeting Notes' },
  { value: 'reference', label: 'Reference' },
  { value: 'template', label: 'Template' },
];

const CATEGORIES: { value: WikiCategory; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'operations', label: 'Operations' },
  { value: 'business-dev', label: 'Business Dev' },
  { value: 'jardin-casa', label: 'Jardin Casa' },
  { value: 'jardin-finca', label: 'Jardin Finca' },
  { value: 'personal', label: 'Personal' },
  { value: 'fitness', label: 'Fitness' },
];

export function WikiPageHeader({
  title,
  icon,
  type,
  category,
  onTitleChange,
  onIconChange,
  onTypeChange,
  onCategoryChange,
}: WikiPageHeaderProps): JSX.Element {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditTitle(title);
  }, [title]);

  useEffect(() => {
    if (isEditingTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleClick = useCallback(() => {
    setIsEditingTitle(true);
  }, []);

  const handleTitleBlur = useCallback(() => {
    setIsEditingTitle(false);
    if (editTitle.trim() !== title) {
      onTitleChange(editTitle.trim());
    }
  }, [editTitle, title, onTitleChange]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleTitleBlur();
      } else if (e.key === 'Escape') {
        setEditTitle(title);
        setIsEditingTitle(false);
      }
    },
    [handleTitleBlur, title]
  );

  return (
    <div className="space-y-4 mb-6">
      {/* Icon and Title row */}
      <div className="flex items-start gap-3">
        <WikiIconPicker icon={icon} onChange={onIconChange} />
        <div className="flex-1 min-w-0">
          {isEditingTitle ? (
            <input
              ref={inputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              className="w-full text-2xl font-bold bg-transparent border-b border-border focus:border-primary focus:outline-none py-1"
              placeholder="Untitled"
            />
          ) : (
            <button
              type="button"
              className="text-2xl font-bold text-primary cursor-pointer hover:text-primary/80 py-1 text-left w-full"
              onClick={handleTitleClick}
            >
              {title || 'Untitled'}
            </button>
          )}
        </div>
      </div>

      {/* Type and Category selectors */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label
            htmlFor="wiki-page-type"
            className="text-xs text-muted-foreground"
          >
            Type:
          </label>
          <select
            id="wiki-page-type"
            value={type || ''}
            onChange={(e) =>
              onTypeChange((e.target.value as WikiPageType) || null)
            }
            className="text-sm bg-muted border-0 rounded px-2 py-1 focus:ring-1 focus:ring-primary"
          >
            <option value="">None</option>
            {PAGE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label
            htmlFor="wiki-page-category"
            className="text-xs text-muted-foreground"
          >
            Category:
          </label>
          <select
            id="wiki-page-category"
            value={category || ''}
            onChange={(e) =>
              onCategoryChange((e.target.value as WikiCategory) || null)
            }
            className="text-sm bg-muted border-0 rounded px-2 py-1 focus:ring-1 focus:ring-primary"
          >
            <option value="">None</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
