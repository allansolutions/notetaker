import { useCallback } from 'react';
import { useWiki } from '../../context/WikiContext';
import { WikiTree } from '../WikiTree';
import { FileText } from 'lucide-react';

interface WikiListViewProps {
  onSelectPage: (id: string) => void;
  onCreatePage: (parentId: string | null) => void;
}

export function WikiListView({
  onSelectPage,
  onCreatePage,
}: WikiListViewProps): JSX.Element {
  const { tree, isLoading, error, removePage } = useWiki();

  const handleDelete = useCallback(
    async (id: string) => {
      if (
        window.confirm(
          'Are you sure you want to delete this page and all its children?'
        )
      ) {
        await removePage(id);
      }
    },
    [removePage]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading wiki...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-semibold text-primary">Wiki</h1>
      </div>

      {/* Tree navigation */}
      <div className="flex-1 overflow-auto -mx-2">
        <WikiTree
          tree={tree}
          selectedId={null}
          onSelect={onSelectPage}
          onCreatePage={onCreatePage}
          onDeletePage={handleDelete}
        />
      </div>
    </div>
  );
}
