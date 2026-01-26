import { useState, useRef, useCallback, KeyboardEvent } from 'react';
import {
  FileText,
  Sheet,
  Presentation,
  FolderOpen,
  ExternalLink,
  X,
  Plus,
} from 'lucide-react';
import { getResourceInfo, type ResourceType } from '@/utils/resourceUrl';

const RESOURCE_ICONS: Record<ResourceType, typeof FileText> = {
  'google-doc': FileText,
  'google-sheet': Sheet,
  'google-slide': Presentation,
  'google-drive': FolderOpen,
  link: ExternalLink,
};

interface ResourceInputProps {
  resources: string[];
  onChange: (resources: string[]) => void;
}

export function ResourceInput({ resources, onChange }: ResourceInputProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addResource = useCallback(
    (url: string) => {
      const trimmed = url.trim();
      if (trimmed && !resources.includes(trimmed)) {
        onChange([...resources, trimmed]);
      }
      setInputValue('');
      setIsAdding(false);
    },
    [resources, onChange]
  );

  const removeResource = useCallback(
    (url: string) => {
      onChange(resources.filter((r) => r !== url));
    },
    [resources, onChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (inputValue.trim()) {
          addResource(inputValue);
        }
      } else if (e.key === 'Escape') {
        setInputValue('');
        setIsAdding(false);
      }
    },
    [inputValue, addResource]
  );

  const handleBlur = useCallback(() => {
    if (inputValue.trim()) {
      addResource(inputValue);
    } else {
      setIsAdding(false);
    }
  }, [inputValue, addResource]);

  const handleStartAdding = useCallback(() => {
    setIsAdding(true);
    // Focus after render
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  return (
    <div className="flex flex-col gap-1">
      {resources.map((url) => {
        const info = getResourceInfo(url);
        const Icon = RESOURCE_ICONS[info.type];

        return (
          <div
            key={url}
            className="group flex items-center gap-2 py-0.5 text-sm"
          >
            <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary truncate"
            >
              {info.label}
            </a>
            <button
              type="button"
              onClick={() => removeResource(url)}
              className="opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/20 rounded-full p-0.5 transition-opacity"
              aria-label={`Remove resource`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}

      {isAdding ? (
        <input
          ref={inputRef}
          type="url"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder="Paste URL..."
          className="bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground/50 py-0.5"
        />
      ) : (
        <button
          type="button"
          onClick={handleStartAdding}
          className="flex items-center gap-1.5 text-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors py-0.5 w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          Add resource
        </button>
      )}
    </div>
  );
}
