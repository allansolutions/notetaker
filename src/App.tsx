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
  const [collapsedBlockIds, setCollapsedBlockIds] = useState<Set<string>>(new Set());

  const handleNavigate = useCallback((id: string) => {
    setNavigateToId(id);
  }, []);

  const handleNavigateComplete = useCallback(() => {
    setNavigateToId(null);
  }, []);

  const handleToggleCollapse = useCallback((id: string) => {
    setCollapsedBlockIds(prev => {
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
          collapsedBlockIds={collapsedBlockIds}
          onToggleCollapse={handleToggleCollapse}
        />
      </div>
      <div className="app-sidebar">
        <Outline
          blocks={blocks}
          onNavigate={handleNavigate}
          collapsedBlockIds={collapsedBlockIds}
          onToggleCollapse={handleToggleCollapse}
        />
      </div>
    </div>
  );
}

export default App;
