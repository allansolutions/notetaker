import { useMemo } from 'react';
import { useTasks } from '@/context/TasksContext';
import { useWiki } from '@/modules/wiki/context/WikiContext';

/**
 * Hook that returns all unique tags from tasks and wiki pages.
 * Tags are shared across both contexts for unified autocomplete.
 */
export function useAvailableTags(): string[] {
  const { tasks } = useTasks();
  const { pages } = useWiki();

  return useMemo(() => {
    const tagSet = new Set<string>();

    tasks.forEach((task) => {
      task.tags?.forEach((tag) => tagSet.add(tag));
    });

    pages.forEach((page) => {
      page.tags?.forEach((tag) => tagSet.add(tag));
    });

    return Array.from(tagSet).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [tasks, pages]);
}
