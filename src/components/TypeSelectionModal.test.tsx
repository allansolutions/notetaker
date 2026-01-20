import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TypeSelectionModal } from './TypeSelectionModal';
import { TASK_TYPE_OPTIONS } from '../types';

describe('TypeSelectionModal', () => {
  const defaultProps = {
    onSelect: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders all 7 task type options', () => {
    render(<TypeSelectionModal {...defaultProps} />);

    TASK_TYPE_OPTIONS.forEach((option) => {
      expect(screen.getByText(option.label)).toBeInTheDocument();
    });
  });

  it('renders modal title', () => {
    render(<TypeSelectionModal {...defaultProps} />);
    expect(screen.getByText('Select Task Type')).toBeInTheDocument();
  });

  it('highlights first option by default', () => {
    render(<TypeSelectionModal {...defaultProps} />);
    const firstButton = screen.getByText('Admin').closest('button');
    expect(firstButton?.className).toContain('bg-hover');
  });

  it('arrow down moves highlight down', () => {
    render(<TypeSelectionModal {...defaultProps} />);

    fireEvent.keyDown(document, { key: 'ArrowDown' });

    const secondButton = screen.getByText('Operations').closest('button');
    expect(secondButton?.className).toContain('bg-hover');
  });

  it('arrow up moves highlight up', () => {
    render(<TypeSelectionModal {...defaultProps} />);

    // First go down
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    fireEvent.keyDown(document, { key: 'ArrowDown' });

    // Then go up
    fireEvent.keyDown(document, { key: 'ArrowUp' });

    const secondButton = screen.getByText('Operations').closest('button');
    expect(secondButton?.className).toContain('bg-hover');
  });

  it('arrow up does not go above first option', () => {
    render(<TypeSelectionModal {...defaultProps} />);

    fireEvent.keyDown(document, { key: 'ArrowUp' });

    const firstButton = screen.getByText('Admin').closest('button');
    expect(firstButton?.className).toContain('bg-hover');
  });

  it('arrow down does not go below last option', () => {
    render(<TypeSelectionModal {...defaultProps} />);

    // Press arrow down more times than there are options
    for (let i = 0; i < TASK_TYPE_OPTIONS.length + 2; i++) {
      fireEvent.keyDown(document, { key: 'ArrowDown' });
    }

    const lastButton = screen.getByText('Fitness').closest('button');
    expect(lastButton?.className).toContain('bg-hover');
  });

  it('Enter calls onSelect with highlighted type after navigation', () => {
    const onSelect = vi.fn();
    render(<TypeSelectionModal {...defaultProps} onSelect={onSelect} />);

    // Move to third option (Business Dev) - navigation clears the "ignore first enter" flag
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    fireEvent.keyDown(document, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith('business-dev');
  });

  it('ignores first Enter to prevent immediate selection', () => {
    const onSelect = vi.fn();
    render(<TypeSelectionModal {...defaultProps} onSelect={onSelect} />);

    // First Enter should be ignored (it's the one that opened the modal)
    fireEvent.keyDown(document, { key: 'Enter' });

    expect(onSelect).not.toHaveBeenCalled();

    // Second Enter should work
    fireEvent.keyDown(document, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith('admin');
  });

  it('Escape calls onCancel', () => {
    const onCancel = vi.fn();
    render(<TypeSelectionModal {...defaultProps} onCancel={onCancel} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onCancel).toHaveBeenCalled();
  });

  it('backdrop click calls onCancel', () => {
    const onCancel = vi.fn();
    render(<TypeSelectionModal {...defaultProps} onCancel={onCancel} />);

    fireEvent.click(screen.getByLabelText('Close modal'));

    expect(onCancel).toHaveBeenCalled();
  });

  it('clicking option calls onSelect with that type', () => {
    const onSelect = vi.fn();
    render(<TypeSelectionModal {...defaultProps} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Personal'));

    expect(onSelect).toHaveBeenCalledWith('personal');
  });

  it('mouse hover changes highlighted option', () => {
    render(<TypeSelectionModal {...defaultProps} />);

    fireEvent.mouseEnter(screen.getByText('Fitness').closest('button')!);

    const fitnessButton = screen.getByText('Fitness').closest('button');
    expect(fitnessButton?.className).toContain('bg-hover');
  });

  it('shows Enter hint on highlighted option', () => {
    render(<TypeSelectionModal {...defaultProps} />);

    // The first option should have the Enter hint
    expect(screen.getByText('Enter')).toBeInTheDocument();
  });
});
