import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TitleFilter, TitleFilterProps } from './TitleFilter';

const defaultProps: TitleFilterProps = {
  searchText: '',
  selectedTaskIds: null,
  availableTasks: [
    { id: '1', title: 'Task One' },
    { id: '2', title: 'Task Two' },
    { id: '3', title: 'Another Task' },
  ],
  onSearchChange: vi.fn(),
  onSelectionChange: vi.fn(),
};

function renderTitleFilter(props: Partial<TitleFilterProps> = {}) {
  return render(<TitleFilter {...defaultProps} {...props} />);
}

describe('TitleFilter', () => {
  it('renders search input', () => {
    renderTitleFilter();
    expect(screen.getByTestId('title-filter-search')).toBeInTheDocument();
  });

  it('renders all available tasks as checkboxes', () => {
    renderTitleFilter();
    expect(screen.getByText('Task One')).toBeInTheDocument();
    expect(screen.getByText('Task Two')).toBeInTheDocument();
    expect(screen.getByText('Another Task')).toBeInTheDocument();
  });

  it('shows correct selected count when all selected (null)', () => {
    renderTitleFilter({ selectedTaskIds: null });
    expect(screen.getByText('3 selected')).toBeInTheDocument();
  });

  it('shows correct selected count when some selected', () => {
    renderTitleFilter({ selectedTaskIds: new Set(['1', '2']) });
    expect(screen.getByText('2 selected')).toBeInTheDocument();
  });

  it('shows correct selected count when none selected', () => {
    renderTitleFilter({ selectedTaskIds: new Set() });
    expect(screen.getByText('0 selected')).toBeInTheDocument();
  });

  it('calls onSearchChange when typing in search', async () => {
    const onSearchChange = vi.fn();
    renderTitleFilter({ onSearchChange });

    const searchInput = screen.getByTestId('title-filter-search');
    await userEvent.type(searchInput, 'test');

    expect(onSearchChange).toHaveBeenCalledWith('t');
    expect(onSearchChange).toHaveBeenCalledWith('te');
    expect(onSearchChange).toHaveBeenCalledWith('tes');
    expect(onSearchChange).toHaveBeenCalledWith('test');
  });

  it('filters tasks by search text', async () => {
    renderTitleFilter();

    const searchInput = screen.getByTestId('title-filter-search');
    await userEvent.type(searchInput, 'One');

    expect(screen.getByText('Task One')).toBeInTheDocument();
    expect(screen.queryByText('Task Two')).not.toBeInTheDocument();
    expect(screen.queryByText('Another Task')).not.toBeInTheDocument();
  });

  it('filters tasks using wildcard pattern', async () => {
    renderTitleFilter();

    const searchInput = screen.getByTestId('title-filter-search');
    await userEvent.type(searchInput, 'Task *');

    expect(screen.getByText('Task One')).toBeInTheDocument();
    expect(screen.getByText('Task Two')).toBeInTheDocument();
    expect(screen.queryByText('Another Task')).not.toBeInTheDocument();
  });

  it('shows "No tasks match search" when filter returns empty', async () => {
    renderTitleFilter();

    const searchInput = screen.getByTestId('title-filter-search');
    await userEvent.type(searchInput, 'nonexistent');

    expect(screen.getByText('No tasks match search')).toBeInTheDocument();
  });

  it('calls onSelectionChange with null when clicking Select all', async () => {
    const onSelectionChange = vi.fn();
    renderTitleFilter({ onSelectionChange, selectedTaskIds: new Set(['1']) });

    await userEvent.click(screen.getByText('Select all 3'));

    expect(onSelectionChange).toHaveBeenCalledWith(null);
  });

  it('calls onSelectionChange with empty set when clicking Clear', async () => {
    const onSelectionChange = vi.fn();
    renderTitleFilter({ onSelectionChange, selectedTaskIds: null });

    await userEvent.click(screen.getByText('Clear'));

    expect(onSelectionChange).toHaveBeenCalledWith(new Set());
  });

  it('toggles individual task selection', async () => {
    const onSelectionChange = vi.fn();
    renderTitleFilter({ onSelectionChange, selectedTaskIds: new Set(['1']) });

    // Click on Task Two checkbox to add it
    const checkbox = screen.getByTestId('title-filter-checkbox-2');
    await userEvent.click(checkbox);

    expect(onSelectionChange).toHaveBeenCalledWith(new Set(['1', '2']));
  });

  it('removes task from selection when unchecking', async () => {
    const onSelectionChange = vi.fn();
    renderTitleFilter({
      onSelectionChange,
      selectedTaskIds: new Set(['1', '2']),
    });

    // Click on Task One checkbox to remove it
    const checkbox = screen.getByTestId('title-filter-checkbox-1');
    await userEvent.click(checkbox);

    expect(onSelectionChange).toHaveBeenCalledWith(new Set(['2']));
  });

  it('converts to null when all tasks become selected', async () => {
    const onSelectionChange = vi.fn();
    renderTitleFilter({
      onSelectionChange,
      selectedTaskIds: new Set(['1', '2']),
    });

    // Click on Another Task checkbox to select all
    const checkbox = screen.getByTestId('title-filter-checkbox-3');
    await userEvent.click(checkbox);

    expect(onSelectionChange).toHaveBeenCalledWith(null);
  });

  it('disables Select all when all already selected', () => {
    renderTitleFilter({ selectedTaskIds: null });

    const selectAllButton = screen.getByText('Select all 3');
    expect(selectAllButton).toBeDisabled();
  });

  it('disables Clear when none selected', () => {
    renderTitleFilter({ selectedTaskIds: new Set() });

    const clearButton = screen.getByText('Clear');
    expect(clearButton).toBeDisabled();
  });

  it('updates Select all count when search filters tasks', async () => {
    renderTitleFilter();

    const searchInput = screen.getByTestId('title-filter-search');
    await userEvent.type(searchInput, 'One');

    expect(screen.getByText('Select all 1')).toBeInTheDocument();
  });

  it('shows wildcard hint', () => {
    renderTitleFilter();
    expect(screen.getByText('Use * as wildcard')).toBeInTheDocument();
  });

  it('handles empty availableTasks', () => {
    renderTitleFilter({ availableTasks: [] });

    expect(screen.getByText('No tasks match search')).toBeInTheDocument();
    expect(screen.getByText('0 selected')).toBeInTheDocument();
  });
});
