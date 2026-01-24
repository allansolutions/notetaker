import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useTasks } from './hooks/useTasks';
import { useCalendarEvents } from './hooks/useCalendarEvents';
import {
  useUrlRouter,
  getInitialRouterState,
  routerFiltersToState,
} from './hooks/useUrlRouter';
import { ThemeProvider } from './context/ThemeContext';
import { GoogleAuthProvider } from './context/GoogleAuthContext';
import { AuthProvider } from './context/AuthContext';
import { TasksProvider } from './context/TasksContext';
import {
  CrmProvider,
  ContactListView,
  ContactDetailView,
  useCrm,
  type Contact,
} from './modules/crm';
import {
  WikiProvider,
  WikiListView,
  WikiPageView,
  useWiki,
  type WikiPage,
} from './modules/wiki';
import { TeamProvider, useTeam } from './modules/teams/context/TeamContext';
import { TeamSwitcher } from './modules/teams/components/TeamSwitcher';
import { TeamSettingsModal } from './modules/teams/components/TeamSettingsModal';
import {
  AcceptInvitePage,
  getInviteTokenFromUrl,
} from './modules/teams/components/AcceptInvitePage';
import {
  ViewType,
  TaskType,
  TASK_TYPE_OPTIONS,
  TaskImportance,
  TASK_IMPORTANCE_OPTIONS,
  DateRange,
  DateFilterPreset,
} from './types';
import {
  SpreadsheetView,
  SpreadsheetFilterState,
} from './components/views/SpreadsheetView';
import { AddTaskData } from './components/AddTaskModal';
import { TaskDetailView } from './components/views/TaskDetailView';
import { FullDayDetailsView } from './components/views/FullDayDetailsView';
import { ArchiveView } from './components/views/ArchiveView';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './components/LoginPage';
import { AuthGuard } from './components/AuthGuard';
import {
  CommandPalette,
  type CommandPaletteItem,
} from './components/CommandPalette';
import { AreaSwitcher } from './components/AreaSwitcher';
import { useTaskSearchIndex } from './hooks/useTaskSearchIndex';
import {
  doesTaskMatchFilters,
  hasActiveFilters,
} from './utils/filter-matching';
import {
  formatDateCompact,
  formatDateRange,
  parseDateQuery,
  getUserLocale,
} from './utils/date-query';
import { getSingleDateFromFilter, startOfDay } from './utils/date-filters';
import { highlightSnippet, tokenizeQuery } from './utils/task-search';

// Get initial state from URL before first render
const initialRouterState = getInitialRouterState();

interface TaskDetailsContext {
  originalFilters: SpreadsheetFilterState;
  pinnedTaskIds: string[];
}

const SIDEBAR_WIDTH_KEY = 'notetaker-sidebar-width';
const SIDEBAR_COLLAPSED_KEY = 'notetaker-sidebar-collapsed';
const DEFAULT_SIDEBAR_WIDTH = 240;
const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 500;
const COLLAPSED_SIDEBAR_WIDTH = 48;
const PALETTE_TASK_LIMIT = 8;
const PALETTE_WIKI_LIMIT = 6;
const PALETTE_CONTACT_LIMIT = 6;

const HIGHLIGHT_CLASS =
  'bg-accent-subtle font-semibold text-primary rounded-sm px-0.5';

function buildContactLabel(contact: { firstName: string; lastName: string }) {
  return `${contact.firstName} ${contact.lastName}`.trim();
}

function buildContactMeta(contact: {
  email?: string;
  company?: { name?: string } | null;
}) {
  const parts = [contact.company?.name, contact.email].filter(Boolean);
  return parts.length > 0 ? parts.join(' • ') : undefined;
}

function createEmptyFilterState(): SpreadsheetFilterState {
  return {
    filters: {
      type: null,
      assignee: null,
      title: null,
      status: null,
      importance: null,
      dueDate: null,
    },
    dateFilterPreset: 'all',
    dateFilterDate: null,
    dateFilterRange: null,
  };
}

interface WikiSearchResult {
  id: string;
  title: string;
  snippet: string | undefined;
  icon: string | null;
  score: number;
}

interface ContactSearchResult {
  id: string;
  label: string;
  meta: string | undefined;
  score: number;
}

function searchWikiPages(pages: WikiPage[], query: string): WikiSearchResult[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [...pages]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, PALETTE_WIKI_LIMIT)
      .map((page) => ({
        id: page.id,
        title: page.title || 'Untitled',
        snippet: undefined,
        icon: page.icon,
        score: 0,
      }));
  }

  const tokens = tokenizeQuery(normalized);

  return pages
    .map((page) => {
      const title = page.title || 'Untitled';
      const titleLower = title.toLowerCase();
      const content = page.blocks.map((b) => b.content).join(' ');
      const contentLower = content.toLowerCase();

      const matches = tokens.every(
        (token) => titleLower.includes(token) || contentLower.includes(token)
      );

      if (!matches) {
        return null;
      }

      let score = 0;
      for (const token of tokens) {
        if (titleLower.includes(token)) {
          score += 2;
        } else if (contentLower.includes(token)) {
          score += 1;
        }
      }

      let snippet: string | undefined;
      const firstToken = tokens[0];
      if (firstToken) {
        const firstMatchIndex = contentLower.indexOf(firstToken);
        if (firstMatchIndex >= 0) {
          const start = Math.max(0, firstMatchIndex - 30);
          const end = Math.min(content.length, firstMatchIndex + 70);
          snippet =
            (start > 0 ? '...' : '') +
            content.slice(start, end) +
            (end < content.length ? '...' : '');
        }
      }

      return {
        id: page.id,
        title,
        snippet,
        icon: page.icon,
        score,
      };
    })
    .filter((result): result is WikiSearchResult => result !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, PALETTE_WIKI_LIMIT);
}

function searchContacts(
  contacts: Contact[],
  query: string
): ContactSearchResult[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [...contacts]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, PALETTE_CONTACT_LIMIT)
      .map((contact) => ({
        id: contact.id,
        label: buildContactLabel(contact),
        meta: buildContactMeta(contact),
        score: 0,
      }));
  }

  const tokens = tokenizeQuery(normalized);

  return contacts
    .map((contact) => {
      const label = buildContactLabel(contact);
      const nameLower = label.toLowerCase();
      const emailLower = contact.email?.toLowerCase() ?? '';
      const companyLower = contact.company?.name?.toLowerCase() ?? '';

      const matches = tokens.every(
        (token) =>
          nameLower.includes(token) ||
          emailLower.includes(token) ||
          companyLower.includes(token)
      );

      if (!matches) {
        return null;
      }

      let score = 0;
      for (const token of tokens) {
        if (nameLower.startsWith(token)) score += 2;
        else if (nameLower.includes(token)) score += 1.5;
        else if (companyLower.includes(token)) score += 1;
        else if (emailLower.includes(token)) score += 0.5;
      }

      return {
        id: contact.id,
        label,
        meta: buildContactMeta(contact),
        score,
      };
    })
    .filter((result): result is ContactSearchResult => result !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, PALETTE_CONTACT_LIMIT);
}

export function AppContent() {
  const {
    tasks,
    isLoading: isLoadingTasks,
    addTask,
    updateTaskById,
    removeTask,
    reorder,
    addSession,
    updateSession,
    deleteSession,
  } = useTasks();

  const { events: calendarEvents } = useCalendarEvents();
  const { pages } = useWiki();
  const { contacts } = useCrm();
  const { members } = useTeam();
  const { searchTasks } = useTaskSearchIndex(tasks);

  // Initialize view and filter state from URL
  const [currentView, setCurrentView] = useState<ViewType>(
    initialRouterState.view
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    initialRouterState.taskId
  );
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    initialRouterState.contactId
  );
  const [selectedWikiPageId, setSelectedWikiPageId] = useState<string | null>(
    initialRouterState.wikiPageId
  );
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isTeamSettingsOpen, setIsTeamSettingsOpen] = useState(false);
  const [spreadsheetViewKey, setSpreadsheetViewKey] = useState(0);
  const [visibleTaskIds, setVisibleTaskIds] = useState<string[]>([]);
  // Tracks which task is focused in the task-details view (for context-aware commands)
  const [focusedDetailsTaskId, setFocusedDetailsTaskId] = useState<
    string | null
  >(null);

  // Task details context - tracks filter state when navigating to task details
  const [taskDetailsContext, setTaskDetailsContext] =
    useState<TaskDetailsContext | null>(null);
  // Return filters - filters to apply when returning to spreadsheet from task notes
  const [returnFilters, setReturnFilters] =
    useState<SpreadsheetFilterState | null>(null);
  const [spreadsheetFilterState, setSpreadsheetFilterState] =
    useState<SpreadsheetFilterState>(() =>
      routerFiltersToState(initialRouterState.filters)
    );

  // URL Router - manages browser history and URL state
  const handleUrlNavigate = useCallback(
    (state: {
      view: ViewType;
      taskId: string | null;
      contactId: string | null;
      wikiPageId: string | null;
      filters: Partial<SpreadsheetFilterState>;
    }) => {
      setCurrentView(state.view);
      setSelectedTaskId(state.taskId);
      setSelectedContactId(state.contactId);
      setSelectedWikiPageId(state.wikiPageId);
      if (Object.keys(state.filters).length > 0) {
        const newFilterState = routerFiltersToState(state.filters);
        setSpreadsheetFilterState(newFilterState);
        setReturnFilters(newFilterState);
        setSpreadsheetViewKey((prev) => prev + 1);
      }
      // Clear task details context when navigating via browser back/forward
      setTaskDetailsContext(null);
    },
    []
  );

  const router = useUrlRouter({ onNavigate: handleUrlNavigate });

  // Store router in ref for use in callbacks that shouldn't re-create on router change
  const routerRef = useRef(router);
  routerRef.current = router;

  const [sidebarWidth, setSidebarWidth] = useLocalStorage<number>(
    SIDEBAR_WIDTH_KEY,
    DEFAULT_SIDEBAR_WIDTH
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage<boolean>(
    SIDEBAR_COLLAPSED_KEY,
    false
  );
  const locale = useMemo(() => getUserLocale(), []);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const delta = resizeRef.current.startX - e.clientX;
      const newWidth = Math.min(
        MAX_SIDEBAR_WIDTH,
        Math.max(MIN_SIDEBAR_WIDTH, resizeRef.current.startWidth + delta)
      );
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setSidebarWidth]);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizeRef.current = { startX: e.clientX, startWidth: sidebarWidth };
      setIsResizing(true);
    },
    [sidebarWidth]
  );

  const handleSelectTask = useCallback(
    (id: string) => {
      setSelectedTaskId(id);
      setCurrentView('task-detail');
      router.navigate('task-detail', { taskId: id });
    },
    [router]
  );

  const handleBackToSpreadsheet = useCallback(() => {
    setCurrentView('spreadsheet');
    setSelectedTaskId(null);
    setFocusedDetailsTaskId(null);
    // Restore filters when going back to spreadsheet
    // If returnFilters is already set (from creating out-of-filter task), use those
    // Otherwise restore the original filters from task details context
    if (!returnFilters && taskDetailsContext) {
      setReturnFilters(taskDetailsContext.originalFilters);
    }
    // Clear task details context when going back
    setTaskDetailsContext(null);
    router.navigate('spreadsheet');
  }, [returnFilters, taskDetailsContext, router]);

  useEffect(() => {
    if (currentView !== 'spreadsheet' && isAddTaskModalOpen) {
      setIsAddTaskModalOpen(false);
    }
  }, [currentView, isAddTaskModalOpen]);

  const handleNavigateToFullDayDetails = useCallback(
    (filterState: SpreadsheetFilterState, visibleTaskIds: string[]) => {
      // Store context for filtering tasks in details view
      setTaskDetailsContext({
        originalFilters: filterState,
        pinnedTaskIds: visibleTaskIds,
      });
      setCurrentView('full-day-details');
      router.navigate('full-day-details');
    },
    [router]
  );

  const handleNavigateToArchive = useCallback(() => {
    setCurrentView('archive');
    router.navigate('archive');
  }, [router]);

  // CRM Navigation Handlers
  const handleNavigateToCrm = useCallback(() => {
    setCurrentView('crm-list');
    setSelectedContactId(null);
    router.navigate('crm-list');
  }, [router]);

  const handleNavigateToCrmNew = useCallback(() => {
    setCurrentView('crm-new');
    setSelectedContactId(null);
    router.navigate('crm-new');
  }, [router]);

  const handleSelectContact = useCallback(
    (contactId: string) => {
      setSelectedContactId(contactId);
      setCurrentView('crm-detail');
      router.navigate('crm-detail', { contactId });
    },
    [router]
  );

  const handleContactSaved = useCallback(() => {
    handleNavigateToCrm();
  }, [handleNavigateToCrm]);

  // Wiki Navigation Handlers
  const handleNavigateToWiki = useCallback(() => {
    setCurrentView('wiki-list');
    setSelectedWikiPageId(null);
    router.navigate('wiki-list');
  }, [router]);

  const handleSelectWikiPage = useCallback(
    (pageId: string) => {
      setSelectedWikiPageId(pageId);
      setCurrentView('wiki-page');
      router.navigate('wiki-page', { wikiPageId: pageId });
    },
    [router]
  );

  // Store a ref to the create page function that will be set by WikiListViewWrapper
  const createWikiPageRef = useRef<((parentId: string | null) => void) | null>(
    null
  );

  const handleCreateWikiPage = useCallback(() => {
    // Navigate to wiki first
    setCurrentView('wiki-list');
    setSelectedWikiPageId(null);
    router.navigate('wiki-list');
    // Trigger page creation after a short delay to ensure context is available
    setTimeout(() => {
      if (createWikiPageRef.current) {
        createWikiPageRef.current(null);
      }
    }, 100);
  }, [router]);

  // Split tasks into active and archived
  const activeTasks = useMemo(
    () => tasks.filter((t) => t.status !== 'done'),
    [tasks]
  );
  const doneTasks = useMemo(
    () => tasks.filter((t) => t.status === 'done'),
    [tasks]
  );

  const handleCommandNavigateToTaskDetails = useCallback(() => {
    if (currentView === 'full-day-details') return;
    const fallbackVisibleTaskIds = activeTasks
      .filter((task) => doesTaskMatchFilters(task, spreadsheetFilterState))
      .map((task) => task.id);
    const nextVisibleTaskIds =
      visibleTaskIds.length > 0 ? visibleTaskIds : fallbackVisibleTaskIds;
    handleNavigateToFullDayDetails(spreadsheetFilterState, nextVisibleTaskIds);
  }, [
    activeTasks,
    currentView,
    handleNavigateToFullDayDetails,
    spreadsheetFilterState,
    visibleTaskIds,
  ]);

  const handleCommandNewTask = useCallback(() => {
    if (currentView !== 'spreadsheet') {
      handleBackToSpreadsheet();
    }
    setIsAddTaskModalOpen(true);
  }, [currentView, handleBackToSpreadsheet]);

  // Context-aware mark as done command
  const handleCommandMarkDone = useCallback(() => {
    // Determine target task based on current view
    let targetTaskId: string | null = null;
    if (currentView === 'task-detail') {
      targetTaskId = selectedTaskId;
    } else if (currentView === 'full-day-details') {
      targetTaskId = focusedDetailsTaskId;
    }

    if (!targetTaskId) return;

    // Mark the task as done and clear blockedReason if it was set
    updateTaskById(targetTaskId, { status: 'done', blockedReason: undefined });

    // Navigate based on context: task-detail → spreadsheet, task-details → stay
    if (currentView === 'task-detail') {
      handleBackToSpreadsheet();
    }
  }, [
    currentView,
    selectedTaskId,
    focusedDetailsTaskId,
    updateTaskById,
    handleBackToSpreadsheet,
  ]);

  // Apply a new filter state - updates all related state in one place
  const applyFilterState = useCallback(
    (nextFilterState: SpreadsheetFilterState) => {
      setSpreadsheetFilterState(nextFilterState);
      setTaskDetailsContext((prev) => {
        if (!prev) return prev;
        return { ...prev, originalFilters: nextFilterState };
      });
      if (currentView === 'spreadsheet') {
        setReturnFilters(nextFilterState);
        setSpreadsheetViewKey((prev) => prev + 1);
      }
    },
    [currentView]
  );

  const handleCommandSetPreset = useCallback(
    (preset: SpreadsheetFilterState['dateFilterPreset']) => {
      // Convert relative presets to specific dates (anchored date filters)
      if (
        preset === 'today' ||
        preset === 'tomorrow' ||
        preset === 'yesterday'
      ) {
        const now = new Date();
        let targetDate = startOfDay(now);
        if (preset === 'tomorrow') {
          targetDate = new Date(targetDate);
          targetDate.setDate(targetDate.getDate() + 1);
        } else if (preset === 'yesterday') {
          targetDate = new Date(targetDate);
          targetDate.setDate(targetDate.getDate() - 1);
        }
        applyFilterState({
          ...spreadsheetFilterState,
          dateFilterPreset: 'specific-date',
          dateFilterDate: targetDate.getTime(),
          dateFilterRange: null,
        });
        return;
      }
      // For non-relative presets (all, this-week, etc.)
      if (spreadsheetFilterState.dateFilterPreset === preset) {
        return;
      }
      applyFilterState({
        ...spreadsheetFilterState,
        dateFilterPreset: preset,
        dateFilterDate: null,
        dateFilterRange: null,
      });
    },
    [applyFilterState, spreadsheetFilterState]
  );

  const handleCommandSetSpecificDate = useCallback(
    (date: number) => {
      applyFilterState({
        ...spreadsheetFilterState,
        dateFilterPreset: 'specific-date',
        dateFilterDate: date,
        dateFilterRange: null,
      });
    },
    [applyFilterState, spreadsheetFilterState]
  );

  const handleCommandSetDateRange = useCallback(
    (range: DateRange) => {
      applyFilterState({
        ...spreadsheetFilterState,
        dateFilterPreset: 'date-range',
        dateFilterDate: null,
        dateFilterRange: range,
      });
    },
    [applyFilterState, spreadsheetFilterState]
  );

  const handleDateFilterChange = useCallback(
    (
      preset: DateFilterPreset,
      date: number | null,
      range: DateRange | null
    ) => {
      applyFilterState({
        ...spreadsheetFilterState,
        dateFilterPreset: preset,
        dateFilterDate: date,
        dateFilterRange: range,
      });
    },
    [applyFilterState, spreadsheetFilterState]
  );

  const handleColumnFiltersChange = useCallback(
    (filters: SpreadsheetFilterState['filters']) => {
      applyFilterState({
        ...spreadsheetFilterState,
        filters,
      });
    },
    [applyFilterState, spreadsheetFilterState]
  );

  const getDateFilterCommand = useCallback(
    (query: string) => {
      const parsed = parseDateQuery(query, locale);

      if (parsed.type === 'invalid-range') {
        return [
          {
            id: 'date-range-invalid',
            label: 'End date must be after start date',
            type: 'command' as const,
            rank: 5,
            disabled: true,
            onExecute: () => {},
          },
        ];
      }

      if (parsed.type === 'single') {
        const label = `Filter: Date - ${formatDateCompact(
          new Date(parsed.date),
          locale
        )}`;
        return [
          {
            id: `date-single-${parsed.date}`,
            label,
            type: 'command' as const,
            rank: 5,
            keywords: ['date', 'filter'],
            onExecute: () => handleCommandSetSpecificDate(parsed.date),
          },
        ];
      }

      if (parsed.type === 'range') {
        const label = `Filter: Date Range - ${formatDateRange(
          parsed.range,
          locale
        )}`;
        return [
          {
            id: `date-range-${parsed.range.start}-${parsed.range.end}`,
            label,
            type: 'command' as const,
            rank: 5,
            keywords: ['date', 'range', 'filter'],
            onExecute: () => handleCommandSetDateRange(parsed.range),
          },
        ];
      }

      return [];
    },
    [handleCommandSetDateRange, handleCommandSetSpecificDate, locale]
  );

  const handleCommandSetTypeFilter = useCallback(
    (type: TaskType) => {
      const currentTypeFilter = spreadsheetFilterState.filters.type;
      if (
        currentTypeFilter?.type === 'multiselect' &&
        currentTypeFilter.selected.size === 1 &&
        currentTypeFilter.selected.has(type)
      ) {
        return;
      }
      applyFilterState({
        ...spreadsheetFilterState,
        filters: {
          ...spreadsheetFilterState.filters,
          type: { type: 'multiselect', selected: new Set([type]) },
        },
      });
    },
    [applyFilterState, spreadsheetFilterState]
  );

  const handleCommandSetAssigneeFilter = useCallback(
    (assigneeId: string) => {
      const currentAssigneeFilter = spreadsheetFilterState.filters.assignee;
      if (
        currentAssigneeFilter?.type === 'multiselect' &&
        currentAssigneeFilter.selected.size === 1 &&
        currentAssigneeFilter.selected.has(assigneeId)
      ) {
        return;
      }
      applyFilterState({
        ...spreadsheetFilterState,
        filters: {
          ...spreadsheetFilterState.filters,
          assignee: { type: 'multiselect', selected: new Set([assigneeId]) },
        },
      });
    },
    [applyFilterState, spreadsheetFilterState]
  );

  const handleCommandSetImportanceFilter = useCallback(
    (importance: TaskImportance) => {
      const currentImportanceFilter = spreadsheetFilterState.filters.importance;
      if (
        currentImportanceFilter?.type === 'multiselect' &&
        currentImportanceFilter.selected.size === 1 &&
        currentImportanceFilter.selected.has(importance)
      ) {
        return;
      }
      applyFilterState({
        ...spreadsheetFilterState,
        filters: {
          ...spreadsheetFilterState.filters,
          importance: { type: 'multiselect', selected: new Set([importance]) },
        },
      });
    },
    [applyFilterState, spreadsheetFilterState]
  );

  const handleCommandClearFilters = useCallback(() => {
    const emptyFilters = createEmptyFilterState();
    const isAlreadyEmpty =
      spreadsheetFilterState.dateFilterPreset === 'all' &&
      !spreadsheetFilterState.dateFilterDate &&
      !spreadsheetFilterState.dateFilterRange &&
      Object.values(spreadsheetFilterState.filters).every((filter) => {
        if (!filter) return true;
        if (filter.type === 'multiselect') return filter.selected.size === 0;
        if (filter.type === 'text') return filter.value.trim() === '';
        if (filter.type === 'date') return filter.value === null;
        if (filter.type === 'title-enhanced') {
          return (
            filter.searchText.trim() === '' && filter.selectedTaskIds === null
          );
        }
        return true;
      });

    if (isAlreadyEmpty) return;

    applyFilterState(emptyFilters);
  }, [applyFilterState, spreadsheetFilterState]);

  const commandPaletteCommands = useMemo<CommandPaletteItem[]>(
    () => [
      {
        id: 'view-all',
        label: 'Filter: All',
        type: 'command',
        keywords: ['view', 'tasks', 'all', 'filter'],
        onExecute: () => handleCommandSetPreset('all'),
      },
      {
        id: 'filter-clear',
        label: 'Filter: Clear',
        type: 'command',
        keywords: ['clear', 'filters', 'reset'],
        onExecute: handleCommandClearFilters,
      },
      {
        id: 'view-today',
        label: 'Filter: Today',
        type: 'command',
        keywords: ['view', 'tasks', 'today', 'filter'],
        onExecute: () => handleCommandSetPreset('today'),
      },
      {
        id: 'view-tomorrow',
        label: 'Filter: Tomorrow',
        type: 'command',
        keywords: ['view', 'tasks', 'tomorrow', 'filter'],
        onExecute: () => handleCommandSetPreset('tomorrow'),
      },
      {
        id: 'view-yesterday',
        label: 'Filter: Yesterday',
        type: 'command',
        keywords: ['view', 'tasks', 'yesterday', 'filter'],
        onExecute: () => handleCommandSetPreset('yesterday'),
      },
      {
        id: 'view-this-week',
        label: 'Filter: This Week',
        type: 'command',
        keywords: ['view', 'tasks', 'week', 'filter'],
        onExecute: () => handleCommandSetPreset('this-week'),
      },
      {
        id: 'view-task-details',
        label: 'Task: Details',
        type: 'command',
        keywords: ['details', 'full day', 'view'],
        onExecute: handleCommandNavigateToTaskDetails,
      },
      {
        id: 'task-new',
        label: 'Task: New',
        type: 'command',
        keywords: ['new', 'create', 'add', 'task'],
        onExecute: handleCommandNewTask,
      },
      {
        id: 'task-mark-done',
        label: 'Task: Mark as Done',
        type: 'command',
        keywords: ['complete', 'finish', 'done', 'mark'],
        shouldShow: () =>
          (currentView === 'task-detail' && selectedTaskId !== null) ||
          (currentView === 'full-day-details' && focusedDetailsTaskId !== null),
        onExecute: handleCommandMarkDone,
      },
      {
        id: 'view-task-list',
        label: 'Task: List',
        type: 'command',
        keywords: ['list', 'tasks', 'view', 'spreadsheet'],
        onExecute: () => {
          if (currentView !== 'spreadsheet') {
            setCurrentView('spreadsheet');
            router.navigate('spreadsheet');
          }
        },
      },
      {
        id: 'view-archive',
        label: 'Task: Archive',
        type: 'command',
        keywords: ['archive', 'completed', 'done', 'tasks'],
        onExecute: handleNavigateToArchive,
      },
      {
        id: 'view-crm',
        label: 'CRM: Contacts',
        type: 'command',
        keywords: ['crm', 'contacts', 'people', 'relationships'],
        onExecute: handleNavigateToCrm,
      },
      {
        id: 'crm-new-contact',
        label: 'CRM: New Contact',
        type: 'command',
        keywords: ['crm', 'contact', 'new', 'create', 'add'],
        onExecute: handleNavigateToCrmNew,
      },
      {
        id: 'view-wiki',
        label: 'Wiki: Pages',
        type: 'command',
        keywords: ['wiki', 'pages', 'knowledge', 'docs', 'documentation'],
        onExecute: handleNavigateToWiki,
      },
      {
        id: 'wiki-new-page',
        label: 'Wiki: New Page',
        type: 'command',
        keywords: ['wiki', 'page', 'new', 'create', 'add'],
        onExecute: handleCreateWikiPage,
      },
      ...TASK_TYPE_OPTIONS.map((option) => ({
        id: `task-type-${option.value}`,
        label: `Type: ${option.label}`,
        type: 'command' as const,
        keywords: ['task', 'type', option.label.toLowerCase()],
        onExecute: () => handleCommandSetTypeFilter(option.value),
      })),
      // Assignee filter commands
      {
        id: 'assignee-unassigned',
        label: 'Assignee: Unassigned',
        type: 'command' as const,
        keywords: ['assignee', 'unassigned', 'filter', 'nobody'],
        onExecute: () => handleCommandSetAssigneeFilter(''),
      },
      ...members.map((member) => ({
        id: `assignee-${member.userId}`,
        label: `Assignee: ${member.user.name || member.user.email}`,
        type: 'command' as const,
        keywords: [
          'assignee',
          'filter',
          (member.user.name || '').toLowerCase(),
          member.user.email.toLowerCase(),
        ],
        onExecute: () => handleCommandSetAssigneeFilter(member.userId),
      })),
      // Priority/Importance filter commands
      ...TASK_IMPORTANCE_OPTIONS.map((option) => ({
        id: `priority-${option.value}`,
        label: `Priority: ${option.label}`,
        type: 'command' as const,
        keywords: ['priority', 'importance', option.label.toLowerCase()],
        onExecute: () => handleCommandSetImportanceFilter(option.value),
      })),
    ],
    [
      currentView,
      router,
      handleCommandSetPreset,
      handleCommandClearFilters,
      handleCommandNavigateToTaskDetails,
      handleCommandNewTask,
      handleCommandMarkDone,
      handleCommandSetTypeFilter,
      handleCommandSetAssigneeFilter,
      handleCommandSetImportanceFilter,
      handleNavigateToArchive,
      handleNavigateToCrm,
      handleNavigateToCrmNew,
      handleNavigateToWiki,
      handleCreateWikiPage,
      selectedTaskId,
      focusedDetailsTaskId,
      members,
    ]
  );

  const getPaletteDynamicItems = useCallback(
    (query: string, queryTokens: string[]) => {
      const shouldShowSnippets = queryTokens.length > 0;
      const dateCommands = getDateFilterCommand(query);

      const taskItems = searchTasks(query)
        .slice(0, PALETTE_TASK_LIMIT)
        .map((result) => ({
          id: `task-${result.id}`,
          label: result.title || 'Untitled',
          type: 'task' as const,
          rank: result.score,
          snippet: shouldShowSnippets
            ? highlightSnippet(result.snippet, queryTokens, HIGHLIGHT_CLASS)
            : undefined,
          onExecute: () => handleSelectTask(result.id),
        }));

      const wikiItems = searchWikiPages(pages, query).map((result) => ({
        id: `wiki-${result.id}`,
        label: result.title || 'Untitled',
        type: 'page' as const,
        icon: result.icon ?? undefined,
        rank: result.score,
        snippet:
          shouldShowSnippets && result.snippet
            ? highlightSnippet(result.snippet, queryTokens, HIGHLIGHT_CLASS)
            : undefined,
        onExecute: () => handleSelectWikiPage(result.id),
      }));

      const contactItems = searchContacts(contacts, query).map((result) => ({
        id: `contact-${result.id}`,
        label: result.label,
        type: 'contact' as const,
        meta: result.meta,
        rank: result.score,
        onExecute: () => handleSelectContact(result.id),
      }));

      return [...dateCommands, ...taskItems, ...wikiItems, ...contactItems];
    },
    [
      contacts,
      getDateFilterCommand,
      handleSelectContact,
      handleSelectTask,
      handleSelectWikiPage,
      pages,
      searchTasks,
    ]
  );

  const handleAddTask = useCallback(
    async (data: AddTaskData) => {
      // Use the date from filter if a single-date filter is active and no dueDate specified
      const dueDate =
        data.dueDate ?? getSingleDateFromFilter(spreadsheetFilterState);
      await addTask(
        data.title,
        data.type,
        data.status,
        data.importance,
        data.estimate,
        dueDate,
        undefined, // insertAtIndex
        data.assigneeId
      );
    },
    [addTask, spreadsheetFilterState]
  );

  const handleInlineTaskCreate = useCallback(
    async (
      title: string,
      type: TaskType,
      insertAfterTaskId?: string | null
    ) => {
      // Find the index to insert at
      let insertAtIndex: number | undefined;
      if (insertAfterTaskId) {
        const afterIndex = tasks.findIndex((t) => t.id === insertAfterTaskId);
        if (afterIndex !== -1) {
          insertAtIndex = afterIndex + 1;
        }
      }
      // Use the date from filter if a single-date filter is active
      const dueDate = getSingleDateFromFilter(spreadsheetFilterState);
      const newTask = await addTask(
        title,
        type,
        'todo',
        undefined,
        undefined,
        dueDate,
        insertAtIndex
      );

      // If we're in task details with active filters, check if the new task matches
      if (newTask && taskDetailsContext) {
        const hasFilters = hasActiveFilters(taskDetailsContext.originalFilters);
        const matchesFilters = hasFilters
          ? doesTaskMatchFilters(newTask, taskDetailsContext.originalFilters)
          : true;

        // Always pin the new task so it shows immediately in details view.
        setTaskDetailsContext((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            pinnedTaskIds: [...prev.pinnedTaskIds, newTask.id],
          };
        });

        if (hasFilters && !matchesFilters) {
          // Task doesn't match original filters - set up return filters
          // Clear all filters except title, set title to show pinned tasks + new task
          setReturnFilters({
            filters: {
              type: null,
              assignee: null,
              title: {
                type: 'title-enhanced',
                searchText: '',
                selectedTaskIds: new Set([
                  ...(taskDetailsContext?.pinnedTaskIds ?? []),
                  newTask.id,
                ]),
              },
              status: null,
              importance: null,
              dueDate: null,
            },
            dateFilterPreset: 'all',
            dateFilterDate: null,
            dateFilterRange: null,
          });
        }
      }

      return newTask;
    },
    [addTask, tasks, taskDetailsContext, spreadsheetFilterState]
  );

  const selectedTask = selectedTaskId
    ? tasks.find((t) => t.id === selectedTaskId)
    : null;

  // Handle invalid task ID in URL - redirect to spreadsheet
  // Only check after tasks have loaded to avoid premature redirects
  useEffect(() => {
    if (
      !isLoadingTasks &&
      currentView === 'task-detail' &&
      selectedTaskId &&
      !selectedTask
    ) {
      setCurrentView('spreadsheet');
      setSelectedTaskId(null);
      router.navigate('spreadsheet');
    }
  }, [isLoadingTasks, currentView, selectedTaskId, selectedTask, router]);

  // Filter tasks for task details view based on pinned task IDs
  // Excludes done tasks so they disappear when marked complete
  const filteredTasksForDetails = useMemo(() => {
    const baseTasks =
      taskDetailsContext && taskDetailsContext.pinnedTaskIds.length > 0
        ? tasks.filter((t) => taskDetailsContext.pinnedTaskIds.includes(t.id))
        : tasks;
    return baseTasks
      .filter((task) => task.status !== 'done')
      .filter((task) => doesTaskMatchFilters(task, spreadsheetFilterState));
  }, [tasks, taskDetailsContext, spreadsheetFilterState]);

  // Handle clearing return filters after they've been applied
  const handleClearReturnFilters = useCallback(() => {
    setReturnFilters(null);
  }, []);

  // Handle visible tasks change - memoized to prevent infinite re-renders
  const handleVisibleTasksChange = useCallback((tasks: { id: string }[]) => {
    setVisibleTaskIds(tasks.map((task) => task.id));
  }, []);

  // Handle filter state change - updates both React state and URL
  // Uses routerRef to avoid infinite re-renders from callback dependency
  const handleFilterStateChange = useCallback(
    (state: SpreadsheetFilterState) => {
      setSpreadsheetFilterState(state);
      routerRef.current.updateFilters(state);
    },
    []
  );

  const isTypingTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || target.isContentEditable;
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMetaK = event.metaKey && event.key.toLowerCase() === 'k';
      if (!isMetaK) return;
      event.preventDefault();
      setIsCommandPaletteOpen((open) => !open);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Keyboard shortcuts for browser back/forward navigation
  // Cmd+[ / Cmd+] on Mac, Alt+Left / Alt+Right as fallback
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;

      // Cmd+[ or Alt+Left for back
      const isBack =
        (event.metaKey && event.key === '[') ||
        (event.altKey && event.key === 'ArrowLeft');

      // Cmd+] or Alt+Right for forward
      const isForward =
        (event.metaKey && event.key === ']') ||
        (event.altKey && event.key === 'ArrowRight');

      if (isBack) {
        event.preventDefault();
        window.history.back();
      } else if (isForward) {
        event.preventDefault();
        window.history.forward();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'task-detail':
        // Invalid task ID case handled by useEffect above
        if (!selectedTask) {
          return null;
        }
        return (
          <TaskDetailView
            task={selectedTask}
            onUpdateTask={updateTaskById}
            onAddSession={addSession}
            onUpdateSession={updateSession}
            onDeleteSession={deleteSession}
            onBack={handleBackToSpreadsheet}
          />
        );
      case 'full-day-details':
        return (
          <FullDayDetailsView
            tasks={filteredTasksForDetails}
            onSelectTask={handleSelectTask}
            onBack={handleBackToSpreadsheet}
            onUpdateTask={updateTaskById}
            onAddTask={handleInlineTaskCreate}
            onAddSession={addSession}
            onFocusedTaskChange={setFocusedDetailsTaskId}
            dateFilterPreset={
              taskDetailsContext?.originalFilters.dateFilterPreset
            }
            dateFilterDate={taskDetailsContext?.originalFilters.dateFilterDate}
            dateFilterRange={
              taskDetailsContext?.originalFilters.dateFilterRange
            }
          />
        );
      case 'archive':
        return (
          <ArchiveView
            tasks={doneTasks}
            onUpdateTask={updateTaskById}
            onDeleteTask={removeTask}
            onReorder={reorder}
            onSelectTask={handleSelectTask}
            onBack={handleBackToSpreadsheet}
            dateFilterPreset={spreadsheetFilterState.dateFilterPreset}
            dateFilterDate={spreadsheetFilterState.dateFilterDate ?? null}
            dateFilterRange={spreadsheetFilterState.dateFilterRange ?? null}
            onDateFilterChange={handleDateFilterChange}
            filters={spreadsheetFilterState.filters}
            onFiltersChange={handleColumnFiltersChange}
          />
        );
      case 'crm-list':
        return (
          <ContactListView
            onBack={handleBackToSpreadsheet}
            onNewContact={handleNavigateToCrmNew}
            onSelectContact={handleSelectContact}
          />
        );
      case 'crm-new':
        return (
          <ContactDetailView
            contactId={null}
            onBack={handleNavigateToCrm}
            onSaved={handleContactSaved}
          />
        );
      case 'crm-detail':
        return (
          <ContactDetailView
            contactId={selectedContactId}
            onBack={handleNavigateToCrm}
            onSaved={handleContactSaved}
          />
        );
      case 'wiki-list':
        return (
          <WikiListViewWrapper
            onSelectPage={handleSelectWikiPage}
            createPageRef={createWikiPageRef}
          />
        );
      case 'wiki-page':
        return selectedWikiPageId ? (
          <WikiPageViewWrapper
            pageId={selectedWikiPageId}
            onNavigateToPage={handleSelectWikiPage}
            onNavigateToList={handleNavigateToWiki}
          />
        ) : null;
      case 'spreadsheet':
      default: {
        // Use returnFilters if set (navigating back from task details),
        // otherwise use current spreadsheetFilterState (preserves URL filters on initial load)
        const initialFilters = returnFilters ?? spreadsheetFilterState;
        if (returnFilters) {
          // Use setTimeout to clear after render
          setTimeout(handleClearReturnFilters, 0);
        }
        return (
          <SpreadsheetView
            key={spreadsheetViewKey}
            tasks={activeTasks}
            onUpdateTask={updateTaskById}
            onDeleteTask={removeTask}
            onReorder={reorder}
            onSelectTask={handleSelectTask}
            onAddTask={handleAddTask}
            isAddTaskModalOpen={isAddTaskModalOpen}
            onAddTaskModalOpenChange={setIsAddTaskModalOpen}
            onNavigateToFullDayDetails={handleNavigateToFullDayDetails}
            onNavigateToArchive={handleNavigateToArchive}
            initialFilters={initialFilters}
            onFilterStateChange={handleFilterStateChange}
            onVisibleTasksChange={handleVisibleTasksChange}
          />
        );
      }
    }
  };

  return (
    <div
      className={`flex min-h-screen ${isResizing ? 'select-none cursor-col-resize' : ''}`}
    >
      <div
        className={`flex-1 mx-auto py-20 px-24 relative ${
          currentView === 'spreadsheet' ||
          currentView === 'archive' ||
          currentView === 'crm-list' ||
          currentView === 'wiki-list'
            ? 'max-w-[var(--width-content-wide)]'
            : 'max-w-[var(--width-content)]'
        }`}
      >
        <div className="absolute top-6 right-6 flex items-center gap-2">
          <TeamSwitcher onOpenSettings={() => setIsTeamSettingsOpen(true)} />
          <AreaSwitcher
            currentView={currentView}
            onNavigateToTasks={handleBackToSpreadsheet}
            onNavigateToCrm={handleNavigateToCrm}
            onNavigateToWiki={handleNavigateToWiki}
          />
        </div>
        {renderView()}
      </div>
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        commands={commandPaletteCommands}
        getDynamicCommands={getPaletteDynamicItems}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
      {isTeamSettingsOpen && (
        <TeamSettingsModal onClose={() => setIsTeamSettingsOpen(false)} />
      )}
      <div
        data-testid="sidebar"
        className="shrink-0 bg-surface-alt sticky top-0 h-screen overflow-y-auto flex"
        style={{
          width: sidebarCollapsed ? COLLAPSED_SIDEBAR_WIDTH : sidebarWidth,
        }}
      >
        {!sidebarCollapsed && (
          <>
            {/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- Interactive separator (splitter) pattern */}
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize sidebar"
              tabIndex={0}
              data-testid="sidebar-resize-handle"
              onMouseDown={handleResizeStart}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  setSidebarWidth((w) => Math.min(MAX_SIDEBAR_WIDTH, w + 10));
                } else if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  setSidebarWidth((w) => Math.max(MIN_SIDEBAR_WIDTH, w - 10));
                }
              }}
              className="w-1 shrink-0 cursor-col-resize border-l border-border hover:bg-accent-subtle active:bg-accent-subtle transition-colors focus:bg-accent-subtle focus:outline-none"
            />
            {/* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
          </>
        )}
        <div className="flex-1 overflow-y-auto">
          <Sidebar
            tasks={activeTasks}
            calendarEvents={calendarEvents}
            onUpdateTask={updateTaskById}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>
      </div>
    </div>
  );
}

function AuthenticatedApp() {
  return (
    <ThemeProvider>
      <GoogleAuthProvider>
        <TeamProvider>
          <TasksProvider>
            <CrmProvider>
              <WikiProvider>
                <AppContent />
              </WikiProvider>
            </CrmProvider>
          </TasksProvider>
        </TeamProvider>
      </GoogleAuthProvider>
    </ThemeProvider>
  );
}

function App() {
  // Check if this is an invite URL
  const inviteToken = getInviteTokenFromUrl();

  const handleInviteAccepted = () => {
    // Redirect to home after accepting invite
    window.location.href = '/';
  };

  if (inviteToken) {
    return (
      <AuthProvider>
        <AcceptInvitePage
          token={inviteToken}
          onAccepted={handleInviteAccepted}
        />
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <AuthGuard fallback={<LoginPage />}>
        <AuthenticatedApp />
      </AuthGuard>
    </AuthProvider>
  );
}

// Wiki view wrappers that use the wiki context
function WikiListViewWrapper({
  onSelectPage,
  createPageRef,
}: {
  onSelectPage: (id: string) => void;
  createPageRef: React.MutableRefObject<
    ((parentId: string | null) => void) | null
  >;
}) {
  const { addPage } = useWiki();

  const handleCreatePage = useCallback(
    async (parentId: string | null) => {
      const page = await addPage({
        title: '',
        parentId,
        blocks: [],
        order: 0,
        icon: null,
        type: null,
        category: null,
      });
      if (page) {
        onSelectPage(page.id);
      }
    },
    [addPage, onSelectPage]
  );

  // Set the ref so command palette can call this
  useEffect(() => {
    createPageRef.current = handleCreatePage;
    return () => {
      createPageRef.current = null;
    };
  }, [createPageRef, handleCreatePage]);

  return (
    <WikiListView onSelectPage={onSelectPage} onCreatePage={handleCreatePage} />
  );
}

function WikiPageViewWrapper({
  pageId,
  onNavigateToPage,
  onNavigateToList,
}: {
  pageId: string;
  onNavigateToPage: (id: string) => void;
  onNavigateToList: () => void;
}) {
  return (
    <WikiPageView
      pageId={pageId}
      onNavigateToPage={onNavigateToPage}
      onNavigateToList={onNavigateToList}
    />
  );
}

export default App;
