import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Outline } from './Outline';
import { ThemeProvider } from '../context/ThemeContext';
import { Block, TodoMetadata } from '../types';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
};

const createBlock = (
  id: string,
  type: Block['type'],
  content: string
): Block => ({
  id,
  type,
  content,
});

describe('Outline', () => {
  const defaultProps = {
    blocks: [] as Block[],
    onNavigate: vi.fn(),
    hiddenBlockIds: new Set<string>(),
    onToggleVisibility: vi.fn(),
    todoMetadata: {} as Record<string, TodoMetadata>,
    onUpdateTodoMetadata: vi.fn(),
  };

  it('renders outline header', () => {
    renderWithTheme(<Outline {...defaultProps} />);
    expect(screen.getByText('Outline')).toBeInTheDocument();
  });

  it('shows "No headings" when no H1 blocks exist', () => {
    renderWithTheme(<Outline {...defaultProps} blocks={[]} />);
    expect(screen.getByText('No headings')).toBeInTheDocument();
  });

  it('shows "No headings" when only non-H1 blocks exist', () => {
    const blocks = [
      createBlock('1', 'paragraph', 'Some text'),
      createBlock('2', 'h2', 'Subheading'),
    ];
    renderWithTheme(<Outline {...defaultProps} blocks={blocks} />);
    expect(screen.getByText('No headings')).toBeInTheDocument();
  });

  it('displays H1 blocks in outline', () => {
    const blocks = [
      createBlock('1', 'h1', 'First Section'),
      createBlock('2', 'paragraph', 'Content'),
      createBlock('3', 'h1', 'Second Section'),
    ];
    renderWithTheme(<Outline {...defaultProps} blocks={blocks} />);

    expect(screen.getByText('First Section')).toBeInTheDocument();
    expect(screen.getByText('Second Section')).toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('displays "Untitled" for empty H1 content', () => {
    const blocks = [createBlock('1', 'h1', '')];
    renderWithTheme(<Outline {...defaultProps} blocks={blocks} />);
    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });

  it('calls onNavigate when H1 text is clicked', () => {
    const onNavigate = vi.fn();
    const blocks = [createBlock('1', 'h1', 'Section')];
    renderWithTheme(
      <Outline {...defaultProps} blocks={blocks} onNavigate={onNavigate} />
    );

    fireEvent.click(screen.getByText('Section'));
    expect(onNavigate).toHaveBeenCalledWith('1');
  });

  it('calls onToggleVisibility when visibility button is clicked', () => {
    const onToggleVisibility = vi.fn();
    const blocks = [createBlock('1', 'h1', 'Section')];
    renderWithTheme(
      <Outline
        {...defaultProps}
        blocks={blocks}
        onToggleVisibility={onToggleVisibility}
      />
    );

    // Find the visibility toggle button by its title (not the theme toggle)
    const toggleButton = screen.getByTitle('Hide section');
    fireEvent.click(toggleButton);
    expect(onToggleVisibility).toHaveBeenCalledWith('1');
  });

  it('adds opacity-50 class when block is hidden', () => {
    const blocks = [createBlock('1', 'h1', 'Section')];
    const hiddenIds = new Set(['1']);
    renderWithTheme(
      <Outline {...defaultProps} blocks={blocks} hiddenBlockIds={hiddenIds} />
    );

    // Find the item container (parent of the text span)
    const itemText = screen.getByText('Section');
    const item = itemText.closest('div.group');
    expect(item?.classList.contains('opacity-50')).toBe(true);
  });

  it('does not add opacity-50 class when block is visible', () => {
    const blocks = [createBlock('1', 'h1', 'Section')];
    renderWithTheme(<Outline {...defaultProps} blocks={blocks} />);

    const itemText = screen.getByText('Section');
    const item = itemText.closest('div.group');
    expect(item?.classList.contains('opacity-50')).toBe(false);
  });

  describe('To-dos section', () => {
    it('renders To-dos header', () => {
      renderWithTheme(<Outline {...defaultProps} />);
      expect(screen.getByText('To-dos')).toBeInTheDocument();
    });

    it('shows "No to-dos" when no todo blocks exist', () => {
      renderWithTheme(<Outline {...defaultProps} blocks={[]} />);
      expect(screen.getByText('No to-dos')).toBeInTheDocument();
    });

    it('displays todo blocks in To-dos section', () => {
      const blocks = [
        createBlock('1', 'todo', 'Buy groceries'),
        createBlock('2', 'paragraph', 'Some text'),
        createBlock('3', 'todo-checked', 'Send email'),
      ];
      renderWithTheme(<Outline {...defaultProps} blocks={blocks} />);

      expect(screen.getByText('Buy groceries')).toBeInTheDocument();
      expect(screen.getByText('Send email')).toBeInTheDocument();
      expect(screen.queryByText('Some text')).not.toBeInTheDocument();
    });

    it('displays "Untitled" for empty todo content', () => {
      const blocks = [createBlock('1', 'todo', '')];
      renderWithTheme(<Outline {...defaultProps} blocks={blocks} />);
      expect(screen.getByText('Untitled')).toBeInTheDocument();
    });

    it('calls onNavigate when todo item is clicked', () => {
      const onNavigate = vi.fn();
      const blocks = [createBlock('1', 'todo', 'My task')];
      renderWithTheme(
        <Outline {...defaultProps} blocks={blocks} onNavigate={onNavigate} />
      );

      fireEvent.click(screen.getByText('My task'));
      expect(onNavigate).toHaveBeenCalledWith('1');
    });

    it('applies line-through style to completed todos', () => {
      const blocks = [createBlock('1', 'todo-checked', 'Done task')];
      renderWithTheme(<Outline {...defaultProps} blocks={blocks} />);

      const todoText = screen.getByText('Done task');
      expect(todoText.classList.contains('line-through')).toBe(true);
    });

    it('does not apply line-through style to pending todos', () => {
      const blocks = [createBlock('1', 'todo', 'Pending task')];
      renderWithTheme(<Outline {...defaultProps} blocks={blocks} />);

      const todoText = screen.getByText('Pending task');
      expect(todoText.classList.contains('line-through')).toBe(false);
    });

    it('renders importance column header', () => {
      const blocks = [createBlock('1', 'todo', 'Task')];
      renderWithTheme(<Outline {...defaultProps} blocks={blocks} />);
      expect(screen.getByText('Importance')).toBeInTheDocument();
    });

    it('renders schedule column header', () => {
      const blocks = [createBlock('1', 'todo', 'Task')];
      renderWithTheme(<Outline {...defaultProps} blocks={blocks} />);
      expect(screen.getByText('Schedule')).toBeInTheDocument();
    });

    it('renders schedule checkbox and importance selector for each todo', () => {
      const blocks = [createBlock('1', 'todo', 'Task')];
      renderWithTheme(<Outline {...defaultProps} blocks={blocks} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('displays current importance value', () => {
      const blocks = [createBlock('1', 'todo', 'Task')];
      const todoMetadata = { '1': { importance: 'high' as const } };
      renderWithTheme(
        <Outline
          {...defaultProps}
          blocks={blocks}
          todoMetadata={todoMetadata}
        />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('high');
    });

    it('displays checked state when scheduled is true', () => {
      const blocks = [createBlock('1', 'todo', 'Task')];
      const todoMetadata = { '1': { scheduled: true } };
      renderWithTheme(
        <Outline
          {...defaultProps}
          blocks={blocks}
          todoMetadata={todoMetadata}
        />
      );

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('calls onUpdateTodoMetadata when importance is changed', () => {
      const onUpdateTodoMetadata = vi.fn();
      const blocks = [createBlock('1', 'todo', 'Task')];
      renderWithTheme(
        <Outline
          {...defaultProps}
          blocks={blocks}
          onUpdateTodoMetadata={onUpdateTodoMetadata}
        />
      );

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'mid' } });
      expect(onUpdateTodoMetadata).toHaveBeenCalledWith('1', {
        importance: 'mid',
      });
    });

    it('calls onUpdateTodoMetadata when schedule checkbox is clicked', () => {
      const onUpdateTodoMetadata = vi.fn();
      const blocks = [createBlock('1', 'todo', 'Task')];
      renderWithTheme(
        <Outline
          {...defaultProps}
          blocks={blocks}
          onUpdateTodoMetadata={onUpdateTodoMetadata}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      expect(onUpdateTodoMetadata).toHaveBeenCalledWith('1', {
        scheduled: true,
      });
    });

    it('shows empty value when no importance is set', () => {
      const blocks = [createBlock('1', 'todo', 'Task')];
      renderWithTheme(<Outline {...defaultProps} blocks={blocks} />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('');
    });

    it('shows unchecked when scheduled is not set', () => {
      const blocks = [createBlock('1', 'todo', 'Task')];
      renderWithTheme(<Outline {...defaultProps} blocks={blocks} />);

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });
  });
});
