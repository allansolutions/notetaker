import { useState, useCallback } from 'react';
import { Editor, createBlock } from './components/Editor';
import { Outline } from './components/Outline';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Block } from './types';
import './styles/editor.css';

const STORAGE_KEY = 'notetaker-blocks';

function App() {
  const [blocks, setBlocks] = useLocalStorage<Block[]>(STORAGE_KEY, [
    createBlock(),
  ]);
  const [navigateToId, setNavigateToId] = useState<string | null>(null);
  const [hiddenBlockIds, setHiddenBlockIds] = useState<Set<string>>(new Set());

  const handleNavigate = useCallback((id: string) => {
    setNavigateToId(id);
  }, []);

  const handleNavigateComplete = useCallback(() => {
    setNavigateToId(null);
  }, []);

  const handleToggleVisibility = useCallback((id: string) => {
    setHiddenBlockIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <div className="app">
      <div className="app-main">
        <Editor
          blocks={blocks}
          setBlocks={setBlocks}
          navigateToId={navigateToId}
          onNavigateComplete={handleNavigateComplete}
          hiddenBlockIds={hiddenBlockIds}
        />
      </div>
      <div className="app-sidebar">
        <Outline
          blocks={blocks}
          onNavigate={handleNavigate}
          hiddenBlockIds={hiddenBlockIds}
          onToggleVisibility={handleToggleVisibility}
        />
      </div>
    </div>
  );
}

export default App;
