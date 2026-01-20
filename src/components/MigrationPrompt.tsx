import { useState, useEffect } from 'react';
import { migrateApi } from '../api/client';
import { useTasks } from '../context/TasksContext';
import type { Task } from '../types';

const TASKS_STORAGE_KEY = 'notetaker-tasks';
const MIGRATION_COMPLETED_KEY = 'notetaker-migration-completed';

export function MigrationPrompt() {
  const { tasks, refreshTasks } = useTasks();
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for localStorage data on mount
  useEffect(() => {
    // Don't show if migration already completed
    if (localStorage.getItem(MIGRATION_COMPLETED_KEY)) {
      return;
    }

    // Don't show if user already has tasks on server
    if (tasks.length > 0) {
      return;
    }

    // Check for localStorage data
    const stored = localStorage.getItem(TASKS_STORAGE_KEY);
    if (stored) {
      try {
        const parsedTasks = JSON.parse(stored) as Task[];
        if (parsedTasks.length > 0) {
          setLocalTasks(parsedTasks);
          setShowPrompt(true);
        }
      } catch {
        // Invalid data, ignore
      }
    }
  }, [tasks.length]);

  const handleImport = async () => {
    setIsImporting(true);
    setError(null);

    try {
      await migrateApi.importData({
        tasks: localTasks,
        settings: {
          theme: localStorage.getItem('notetaker-theme') || 'system',
          sidebarWidth: parseInt(
            localStorage.getItem('notetaker-sidebar-width') || '320',
            10
          ),
        },
      });

      // Mark migration as complete
      localStorage.setItem(MIGRATION_COMPLETED_KEY, 'true');

      // Clear old localStorage data
      localStorage.removeItem(TASKS_STORAGE_KEY);

      // Refresh tasks from server
      await refreshTasks();

      setShowPrompt(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import data');
    } finally {
      setIsImporting(false);
    }
  };

  const handleSkip = () => {
    // Mark migration as complete so we don't ask again
    localStorage.setItem(MIGRATION_COMPLETED_KEY, 'true');
    setShowPrompt(false);
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Import existing tasks?
        </h2>

        <p className="mt-2 text-gray-600 dark:text-gray-400">
          We found {localTasks.length} task{localTasks.length !== 1 ? 's' : ''}{' '}
          saved on this device. Would you like to import them to your account?
        </p>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 dark:bg-red-900/20">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSkip}
            disabled={isImporting}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Start fresh
          </button>
          <button
            onClick={handleImport}
            disabled={isImporting}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isImporting ? 'Importing...' : 'Import tasks'}
          </button>
        </div>
      </div>
    </div>
  );
}
