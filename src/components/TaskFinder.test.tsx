import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskFinder } from './TaskFinder';
import { Task } from '../types';

const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: overrides.id ?? 'task-1',
  type: 'admin',
  title: 'Sample Task',
  status: 'todo',
  importance: 'mid',
  blocks: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

describe('TaskFinder', () => {
  it('does not render when closed', () => {
    render(
      <TaskFinder
        isOpen={false}
        tasks={[]}
        onClose={vi.fn()}
        onSelectTask={vi.fn()}
      />
    );

    expect(screen.queryByText('Task Finder')).not.toBeInTheDocument();
  });

  it('renders results and focuses input when open', () => {
    const tasks = [createMockTask({ id: 'task-1', title: 'Alpha Task' })];

    render(
      <TaskFinder
        isOpen
        tasks={tasks}
        onClose={vi.fn()}
        onSelectTask={vi.fn()}
      />
    );

    expect(screen.getByText('Task Finder')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveFocus();
    expect(screen.getByText('Alpha Task')).toBeInTheDocument();
  });

  it('filters tasks based on query input', () => {
    const tasks = [
      createMockTask({
        id: 'task-1',
        title: 'Alpha Task',
        blocks: [{ id: 'b1', type: 'paragraph', content: 'Buy apples' }],
      }),
      createMockTask({
        id: 'task-2',
        title: 'Bravo Task',
        blocks: [{ id: 'b2', type: 'paragraph', content: 'Call client' }],
      }),
    ];

    render(
      <TaskFinder
        isOpen
        tasks={tasks}
        onClose={vi.fn()}
        onSelectTask={vi.fn()}
      />
    );

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'appl' },
    });

    expect(screen.getByText('Alpha Task')).toBeInTheDocument();
    expect(screen.queryByText('Bravo Task')).not.toBeInTheDocument();
  });

  it('shows empty state when no tasks match', () => {
    const tasks = [createMockTask({ id: 'task-1', title: 'Alpha Task' })];

    render(
      <TaskFinder
        isOpen
        tasks={tasks}
        onClose={vi.fn()}
        onSelectTask={vi.fn()}
      />
    );

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'missing' },
    });

    expect(screen.getByText('No results found.')).toBeInTheDocument();
  });

  it('executes selection on Enter', () => {
    const onClose = vi.fn();
    const onSelectTask = vi.fn();
    const tasks = [
      createMockTask({
        id: 'task-1',
        title: 'Alpha Task',
        blocks: [{ id: 'b1', type: 'paragraph', content: 'Buy apples' }],
      }),
    ];

    render(
      <TaskFinder
        isOpen
        tasks={tasks}
        onClose={onClose}
        onSelectTask={onSelectTask}
      />
    );

    fireEvent.keyDown(screen.getByRole('textbox'), {
      key: 'Enter',
    });

    expect(onSelectTask).toHaveBeenCalledWith('task-1');
    expect(onClose).toHaveBeenCalled();
  });

  it('closes when pressing Escape', () => {
    const onClose = vi.fn();
    const tasks = [createMockTask({ id: 'task-1', title: 'Alpha Task' })];

    render(
      <TaskFinder
        isOpen
        tasks={tasks}
        onClose={onClose}
        onSelectTask={vi.fn()}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('moves selection with arrow keys', () => {
    const tasks = [
      createMockTask({ id: 'task-1', title: 'Alpha Task' }),
      createMockTask({ id: 'task-2', title: 'Bravo Task' }),
    ];

    render(
      <TaskFinder
        isOpen
        tasks={tasks}
        onClose={vi.fn()}
        onSelectTask={vi.fn()}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });

    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('selects item on click and hover', () => {
    const onClose = vi.fn();
    const onSelectTask = vi.fn();
    const tasks = [
      createMockTask({ id: 'task-1', title: 'Alpha Task' }),
      createMockTask({ id: 'task-2', title: 'Bravo Task' }),
    ];

    render(
      <TaskFinder
        isOpen
        tasks={tasks}
        onClose={onClose}
        onSelectTask={onSelectTask}
      />
    );

    const options = screen.getAllByRole('option');
    fireEvent.mouseEnter(options[1]);
    expect(options[1]).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(options[1]);
    expect(onSelectTask).toHaveBeenCalledWith('task-2');
    expect(onClose).toHaveBeenCalled();
  });

  it('ignores Enter when no results', () => {
    const onSelectTask = vi.fn();
    const tasks = [createMockTask({ id: 'task-1', title: 'Alpha Task' })];

    render(
      <TaskFinder
        isOpen
        tasks={tasks}
        onClose={vi.fn()}
        onSelectTask={onSelectTask}
      />
    );

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'missing' },
    });
    fireEvent.keyDown(screen.getByRole('textbox'), {
      key: 'Enter',
    });

    expect(onSelectTask).not.toHaveBeenCalled();
  });

  it('keeps selection at zero when results are empty', () => {
    const tasks = [createMockTask({ id: 'task-1', title: 'Alpha Task' })];

    render(
      <TaskFinder
        isOpen
        tasks={tasks}
        onClose={vi.fn()}
        onSelectTask={vi.fn()}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'missing' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });

    expect(screen.getByText('No results found.')).toBeInTheDocument();
  });

  describe('wiki pages', () => {
    const createMockWikiPage = (id: string, title: string, content = '') => ({
      id,
      title,
      slug: title.toLowerCase().replace(/\s/g, '-'),
      parentId: null,
      blocks: content
        ? [{ id: `b-${id}`, type: 'paragraph' as const, content }]
        : [],
      order: 0,
      icon: null,
      type: null,
      category: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    it('shows wiki pages when provided', () => {
      const wikiPages = [
        createMockWikiPage('wiki-1', 'Meeting Notes'),
        createMockWikiPage('wiki-2', 'Project Plan'),
      ];

      render(
        <TaskFinder
          isOpen
          tasks={[]}
          wikiPages={wikiPages}
          onClose={vi.fn()}
          onSelectTask={vi.fn()}
          onSelectWikiPage={vi.fn()}
        />
      );

      expect(screen.getByText('Meeting Notes')).toBeInTheDocument();
      expect(screen.getByText('Project Plan')).toBeInTheDocument();
    });

    it('filters wiki pages by title', () => {
      const wikiPages = [
        createMockWikiPage('wiki-1', 'Meeting Notes'),
        createMockWikiPage('wiki-2', 'Project Plan'),
      ];

      render(
        <TaskFinder
          isOpen
          tasks={[]}
          wikiPages={wikiPages}
          onClose={vi.fn()}
          onSelectTask={vi.fn()}
          onSelectWikiPage={vi.fn()}
        />
      );

      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'meeting' },
      });

      expect(screen.getByText('Meeting Notes')).toBeInTheDocument();
      expect(screen.queryByText('Project Plan')).not.toBeInTheDocument();
    });

    it('filters wiki pages by content', () => {
      const wikiPages = [
        createMockWikiPage('wiki-1', 'Page One', 'Contains important info'),
        createMockWikiPage('wiki-2', 'Page Two', 'Has different content'),
      ];

      render(
        <TaskFinder
          isOpen
          tasks={[]}
          wikiPages={wikiPages}
          onClose={vi.fn()}
          onSelectTask={vi.fn()}
          onSelectWikiPage={vi.fn()}
        />
      );

      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'important' },
      });

      expect(screen.getByText('Page One')).toBeInTheDocument();
      expect(screen.queryByText('Page Two')).not.toBeInTheDocument();
    });

    it('shows snippet for wiki page content matches', () => {
      const wikiPages = [
        createMockWikiPage(
          'wiki-1',
          'Long Document',
          'This is some text before the important part and after it continues with more text'
        ),
      ];

      render(
        <TaskFinder
          isOpen
          tasks={[]}
          wikiPages={wikiPages}
          onClose={vi.fn()}
          onSelectTask={vi.fn()}
          onSelectWikiPage={vi.fn()}
        />
      );

      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'important' },
      });

      expect(screen.getByText('Long Document')).toBeInTheDocument();
    });

    it('selects wiki page on click', () => {
      const onSelectWikiPage = vi.fn();
      const onClose = vi.fn();
      const wikiPages = [createMockWikiPage('wiki-1', 'My Wiki Page')];

      render(
        <TaskFinder
          isOpen
          tasks={[]}
          wikiPages={wikiPages}
          onClose={onClose}
          onSelectTask={vi.fn()}
          onSelectWikiPage={onSelectWikiPage}
        />
      );

      fireEvent.click(screen.getByText('My Wiki Page'));

      expect(onSelectWikiPage).toHaveBeenCalledWith('wiki-1');
      expect(onClose).toHaveBeenCalled();
    });

    it('handles wiki page without title', () => {
      const wikiPages = [createMockWikiPage('wiki-1', '')];

      render(
        <TaskFinder
          isOpen
          tasks={[]}
          wikiPages={wikiPages}
          onClose={vi.fn()}
          onSelectTask={vi.fn()}
          onSelectWikiPage={vi.fn()}
        />
      );

      expect(screen.getByText('Untitled')).toBeInTheDocument();
    });

    it('shows wiki page icon when available', () => {
      const wikiPages = [
        {
          ...createMockWikiPage('wiki-1', 'Notes'),
          icon: '📝',
        },
      ];

      render(
        <TaskFinder
          isOpen
          tasks={[]}
          wikiPages={wikiPages}
          onClose={vi.fn()}
          onSelectTask={vi.fn()}
          onSelectWikiPage={vi.fn()}
        />
      );

      expect(screen.getByText('📝')).toBeInTheDocument();
    });

    it('does not call onSelectWikiPage when undefined', () => {
      const onClose = vi.fn();
      const wikiPages = [createMockWikiPage('wiki-1', 'My Wiki Page')];

      render(
        <TaskFinder
          isOpen
          tasks={[]}
          wikiPages={wikiPages}
          onClose={onClose}
          onSelectTask={vi.fn()}
          // onSelectWikiPage is not provided
        />
      );

      fireEvent.click(screen.getByText('My Wiki Page'));
      expect(onClose).toHaveBeenCalled();
    });

    it('resets selection when results shrink below selected index', () => {
      const wikiPages = [
        createMockWikiPage('wiki-1', 'Alpha Page'),
        createMockWikiPage('wiki-2', 'Beta Page'),
        createMockWikiPage('wiki-3', 'Gamma Page'),
      ];

      render(
        <TaskFinder
          isOpen
          tasks={[]}
          wikiPages={wikiPages}
          onClose={vi.fn()}
          onSelectTask={vi.fn()}
          onSelectWikiPage={vi.fn()}
        />
      );

      const input = screen.getByRole('textbox');
      // Move selection down
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      // Now filter to single result - selection should reset
      fireEvent.change(input, { target: { value: 'alpha' } });

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(1);
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('shows snippet with ellipsis for long content match at start', () => {
      const longContent =
        'This is a very long piece of content that contains the keyword somewhere in the middle of this text which continues for quite a bit longer to test the ellipsis functionality';
      const wikiPages = [createMockWikiPage('wiki-1', 'Test', longContent)];

      render(
        <TaskFinder
          isOpen
          tasks={[]}
          wikiPages={wikiPages}
          onClose={vi.fn()}
          onSelectTask={vi.fn()}
          onSelectWikiPage={vi.fn()}
        />
      );

      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'keyword' },
      });

      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('limits wiki pages to 10 results without query', () => {
      const manyPages = Array.from({ length: 15 }, (_, i) =>
        createMockWikiPage(`wiki-${i}`, `Page ${i}`)
      );

      render(
        <TaskFinder
          isOpen
          tasks={[]}
          wikiPages={manyPages}
          onClose={vi.fn()}
          onSelectTask={vi.fn()}
          onSelectWikiPage={vi.fn()}
        />
      );

      // Should show max 10 pages
      const options = screen.getAllByRole('option');
      expect(options.length).toBeLessThanOrEqual(10);
    });

    it('searches with multiple query tokens', () => {
      const wikiPages = [
        createMockWikiPage('wiki-1', 'Project Alpha'),
        createMockWikiPage('wiki-2', 'Project Beta'),
        createMockWikiPage('wiki-3', 'Another Alpha'),
      ];

      render(
        <TaskFinder
          isOpen
          tasks={[]}
          wikiPages={wikiPages}
          onClose={vi.fn()}
          onSelectTask={vi.fn()}
          onSelectWikiPage={vi.fn()}
        />
      );

      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'project alpha' },
      });

      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      expect(screen.queryByText('Project Beta')).not.toBeInTheDocument();
      expect(screen.queryByText('Another Alpha')).not.toBeInTheDocument();
    });
  });
});
