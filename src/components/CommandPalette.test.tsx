import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommandPalette, CommandPaletteCommand } from './CommandPalette';

const createCommands = (onExecute: () => void): CommandPaletteCommand[] => [
  { id: 'all', label: 'All', keywords: ['view', 'tasks'], onExecute },
  { id: 'today', label: 'Today', keywords: ['view', 'tasks'], onExecute },
  { id: 'tomorrow', label: 'Tomorrow', keywords: ['view', 'tasks'], onExecute },
];

describe('CommandPalette', () => {
  it('does not render when closed', () => {
    render(<CommandPalette isOpen={false} commands={[]} onClose={vi.fn()} />);

    expect(screen.queryByText('Command Palette')).not.toBeInTheDocument();
  });

  it('renders commands and focuses input when open', () => {
    const onExecute = vi.fn();
    render(
      <CommandPalette
        isOpen
        commands={createCommands(onExecute)}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Command Palette')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type a command...')).toHaveFocus();
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('filters commands based on query', () => {
    const onExecute = vi.fn();
    render(
      <CommandPalette
        isOpen
        commands={createCommands(onExecute)}
        onClose={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Type a command...'), {
      target: { value: 'tom' },
    });

    expect(screen.getByText('Tomorrow')).toBeInTheDocument();
    expect(screen.queryByText('Today')).not.toBeInTheDocument();
  });

  it('matches query text after a colon prefix', () => {
    const onExecute = vi.fn();
    render(
      <CommandPalette
        isOpen
        commands={createCommands(onExecute)}
        onClose={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Type a command...'), {
      target: { value: 'filter: tod' },
    });

    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.queryByText('All')).not.toBeInTheDocument();
  });

  it('shows empty state when no commands match', () => {
    const onExecute = vi.fn();
    render(
      <CommandPalette
        isOpen
        commands={createCommands(onExecute)}
        onClose={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Type a command...'), {
      target: { value: 'zzz' },
    });

    expect(screen.getByText('No commands found.')).toBeInTheDocument();
  });

  it('matches label text after a colon in the command label', () => {
    const onExecute = vi.fn();
    const commands: CommandPaletteCommand[] = [
      { id: 'filter-today', label: 'Filter: Today', onExecute },
    ];
    render(<CommandPalette isOpen commands={commands} onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Type a command...'), {
      target: { value: 'today' },
    });

    expect(screen.getByText('Filter: Today')).toBeInTheDocument();
  });

  it('arrow keys change selection and Enter executes', () => {
    const onExecute = vi.fn();
    const onClose = vi.fn();
    render(
      <CommandPalette
        isOpen
        commands={createCommands(onExecute)}
        onClose={onClose}
      />
    );

    const input = screen.getByPlaceholderText('Type a command...');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onExecute).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('arrow up wraps selection to the last command', () => {
    const first = vi.fn();
    const second = vi.fn();
    const third = vi.fn();
    render(
      <CommandPalette
        isOpen
        commands={[
          { id: 'first', label: 'First', onExecute: first },
          { id: 'second', label: 'Second', onExecute: second },
          { id: 'third', label: 'Third', onExecute: third },
        ]}
        onClose={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Type a command...');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(third).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
  });

  it('Escape closes the palette', () => {
    const onClose = vi.fn();
    render(
      <CommandPalette
        isOpen
        commands={createCommands(vi.fn())}
        onClose={onClose}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('backdrop click closes the palette', () => {
    const onClose = vi.fn();
    render(
      <CommandPalette
        isOpen
        commands={createCommands(vi.fn())}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByLabelText('Close command palette'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe('shouldShow filtering', () => {
    it('hides commands where shouldShow returns false', () => {
      const commands: CommandPaletteCommand[] = [
        { id: 'visible', label: 'Visible', onExecute: vi.fn() },
        {
          id: 'hidden',
          label: 'Hidden',
          shouldShow: () => false,
          onExecute: vi.fn(),
        },
      ];
      render(<CommandPalette isOpen commands={commands} onClose={vi.fn()} />);

      expect(screen.getByText('Visible')).toBeInTheDocument();
      expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
    });

    it('shows commands where shouldShow returns true', () => {
      const commands: CommandPaletteCommand[] = [
        {
          id: 'conditional',
          label: 'Conditional',
          shouldShow: () => true,
          onExecute: vi.fn(),
        },
      ];
      render(<CommandPalette isOpen commands={commands} onClose={vi.fn()} />);

      expect(screen.getByText('Conditional')).toBeInTheDocument();
    });

    it('shows commands without shouldShow (defaults to visible)', () => {
      const commands: CommandPaletteCommand[] = [
        { id: 'default', label: 'Default Visible', onExecute: vi.fn() },
      ];
      render(<CommandPalette isOpen commands={commands} onClose={vi.fn()} />);

      expect(screen.getByText('Default Visible')).toBeInTheDocument();
    });

    it('re-evaluates shouldShow when command array changes', () => {
      const hiddenCommands: CommandPaletteCommand[] = [
        {
          id: 'conditional',
          label: 'Context Command',
          shouldShow: () => false,
          onExecute: vi.fn(),
        },
      ];
      const visibleCommands: CommandPaletteCommand[] = [
        {
          id: 'conditional',
          label: 'Context Command',
          shouldShow: () => true,
          onExecute: vi.fn(),
        },
      ];

      const { rerender } = render(
        <CommandPalette isOpen commands={hiddenCommands} onClose={vi.fn()} />
      );

      expect(screen.queryByText('Context Command')).not.toBeInTheDocument();

      // Rerender with commands that should now be visible
      rerender(
        <CommandPalette isOpen commands={visibleCommands} onClose={vi.fn()} />
      );

      expect(screen.getByText('Context Command')).toBeInTheDocument();
    });
  });
});
