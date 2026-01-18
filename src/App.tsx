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

  const handleNavigate = useCallback((id: string) => {
    setNavigateToId(id);
  }, []);

  const handleNavigateComplete = useCallback(() => {
    setNavigateToId(null);
  }, []);

  return (
    <div className="app">
      <div className="app-main">
        <Editor
          blocks={blocks}
          setBlocks={setBlocks}
          navigateToId={navigateToId}
          onNavigateComplete={handleNavigateComplete}
        />
      </div>
      <div className="app-sidebar">
        <Outline blocks={blocks} onNavigate={handleNavigate} />
      </div>
    </div>
  );
}

export default App;
