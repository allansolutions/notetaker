import { useState, useCallback } from 'react';
import { Editor, createBlock } from './components/Editor';
import { Outline } from './components/Outline';
import { useLocalStorage } from './hooks/useLocalStorage';
import { ThemeProvider } from './context/ThemeContext';
import { Block } from './types';
import './styles/main.css';

const STORAGE_KEY = 'notetaker-blocks';

function App() {
  const [blocks, setBlocks] = useLocalStorage<Block[]>(STORAGE_KEY, [
    createBlock(),
  ]);
  const [navigateToId, setNavigateToId] = useState<string | null>(null);
  const [collapsedBlockIds, setCollapsedBlockIds] = useState<Set<string>>(new Set());
  const [hiddenBlockIds, setHiddenBlockIds] = useState<Set<string>>(new Set());

  const handleNavigate = useCallback((id: string) => {
    setNavigateToId(id);
  }, []);

  const handleNavigateComplete = useCallback(() => {
    setNavigateToId(null);
  }, []);

  const toggleSetItem = useCallback(
    (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (id: string) => {
      setter(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    []
  );

  const handleToggleCollapse = useCallback(toggleSetItem(setCollapsedBlockIds), [toggleSetItem]);
  const handleToggleVisibility = useCallback(toggleSetItem(setHiddenBlockIds), [toggleSetItem]);

  return (
    <ThemeProvider>
      <div className="flex min-h-screen">
        <div className="flex-1 max-w-[var(--width-content)] mx-auto py-20 px-24">
          <Editor
            blocks={blocks}
            setBlocks={setBlocks}
            navigateToId={navigateToId}
            onNavigateComplete={handleNavigateComplete}
            collapsedBlockIds={collapsedBlockIds}
            onToggleCollapse={handleToggleCollapse}
            hiddenBlockIds={hiddenBlockIds}
          />
        </div>
        <div className="w-[var(--width-sidebar)] shrink-0 border-l border-border bg-surface-alt sticky top-0 h-screen overflow-y-auto">
          <Outline
            blocks={blocks}
            onNavigate={handleNavigate}
            hiddenBlockIds={hiddenBlockIds}
            onToggleVisibility={handleToggleVisibility}
          />
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
