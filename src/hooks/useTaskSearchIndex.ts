import MiniSearch from 'minisearch';
import { useCallback, useMemo } from 'react';
import { Task } from '../types';
import { getSnippetForBlocks, tokenizeQuery } from '../utils/task-search';

interface TaskSearchDoc {
  id: string;
  title: string;
  content: string;
}

export interface TaskSearchResult {
  id: string;
  title: string;
  snippet: string;
  score: number;
}

const RESULT_LIMIT = 20;

function normalizeContent(content: string): string {
  return content.replace(/\s+/g, ' ').trim();
}

function buildSearchDocs(tasks: Task[]): TaskSearchDoc[] {
  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    content: normalizeContent(
      task.blocks.map((block) => block.content).join(' ')
    ),
  }));
}

export function useTaskSearchIndex(tasks: Task[]) {
  const taskById = useMemo(() => {
    return new Map(tasks.map((task) => [task.id, task]));
  }, [tasks]);

  const recentTasks = useMemo(() => {
    return [...tasks]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, RESULT_LIMIT);
  }, [tasks]);

  const searchIndex = useMemo(() => {
    const index = new MiniSearch<TaskSearchDoc>({
      fields: ['title', 'content'],
      storeFields: ['title'],
      searchOptions: {
        prefix: true,
        combineWith: 'AND',
        boost: { title: 3, content: 1 },
      },
    });

    const docs = buildSearchDocs(tasks);
    if (docs.length > 0) {
      index.addAll(docs);
    }

    return index;
  }, [tasks]);

  const searchTasks = useCallback(
    (query: string): TaskSearchResult[] => {
      const normalizedQuery = query.trim();
      const tokens = tokenizeQuery(normalizedQuery);

      if (!normalizedQuery) {
        return recentTasks.map((task) => ({
          id: task.id,
          title: task.title,
          snippet: getSnippetForBlocks(task.blocks, tokens),
          score: 0,
        }));
      }

      const fuzzy =
        tokens.length >= 1 && normalizedQuery.length >= 3 ? 0.3 : false;
      const matches = searchIndex.search(normalizedQuery, {
        prefix: true,
        fuzzy,
        combineWith: 'AND',
        boost: { title: 3, content: 1 },
      });

      return matches.slice(0, RESULT_LIMIT).map((match) => {
        const task = taskById.get(match.id) as Task;
        return {
          id: task.id,
          title: task.title,
          snippet: getSnippetForBlocks(task.blocks, tokens),
          score: match.score,
        };
      });
    },
    [recentTasks, searchIndex, taskById]
  );

  return { searchTasks };
}
