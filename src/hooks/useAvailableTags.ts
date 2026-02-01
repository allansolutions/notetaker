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

    for (const task of tasks) {
      for (const tag of task.tags ?? []) tagSet.add(tag);
    }

    for (const page of pages) {
      for (const tag of page.tags ?? []) tagSet.add(tag);
    }

    return Array.from(tagSet).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [tasks, pages]);
}
