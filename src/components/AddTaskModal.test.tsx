import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { AddTaskModal } from './AddTaskModal';

describe('AddTaskModal', () => {
  const mockOnSubmit = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    onSubmit: mockOnSubmit,
    onClose: mockOnClose,
  };

  describe('rendering', () => {
    it('renders modal with title', () => {
      render(<AddTaskModal {...defaultProps} />);
      expect(screen.getByText('Add Task')).toBeInTheDocument();
    });

    it('renders all form fields', () => {
      render(<AddTaskModal {...defaultProps} />);
      expect(screen.getByLabelText('Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Task')).toBeInTheDocument();
      expect(screen.getByLabelText('Status')).toBeInTheDocument();
      expect(screen.getByLabelText('Importance')).toBeInTheDocument();
      expect(screen.getByText('Estimate')).toBeInTheDocument();
      expect(screen.getByText('Date')).toBeInTheDocument();
    });

    it('renders estimate preset buttons', () => {
      render(<AddTaskModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: '15m' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '30m' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '1h' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '2h' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '4h' })).toBeInTheDocument();
    });

    it('renders estimate custom input', () => {
      render(<AddTaskModal {...defaultProps} />);
      expect(screen.getByPlaceholderText('Custom (min)')).toBeInTheDocument();
    });

    it('renders Create and Cancel buttons', () => {
      render(<AddTaskModal {...defaultProps} />);
      expect(screen.getByText('Create')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('has Type dropdown with placeholder', () => {
      render(<AddTaskModal {...defaultProps} />);
      const typeSelect = screen.getByLabelText('Type') as HTMLSelectElement;
      expect(typeSelect.value).toBe('');
      expect(
        screen.getByRole('option', { name: 'Select type...' })
      ).toBeInTheDocument();
    });

    it('has Status dropdown defaulting to todo', () => {
      render(<AddTaskModal {...defaultProps} />);
      const statusSelect = screen.getByLabelText('Status') as HTMLSelectElement;
      expect(statusSelect.value).toBe('todo');
    });

    it('has Importance dropdown with placeholder', () => {
      render(<AddTaskModal {...defaultProps} />);
      const importanceSelect = screen.getByLabelText(
        'Importance'
      ) as HTMLSelectElement;
      expect(importanceSelect.value).toBe('');
      expect(
        screen.getByRole('option', { name: 'Select importance...' })
      ).toBeInTheDocument();
    });

    it('has Date button with placeholder text', () => {
      render(<AddTaskModal {...defaultProps} />);
      expect(screen.getByText('Select date...')).toBeInTheDocument();
    });
  });

  describe('Type dropdown', () => {
    it('has all type options', () => {
      render(<AddTaskModal {...defaultProps} />);
      expect(screen.getByRole('option', { name: 'Admin' })).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Operations' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Business Dev' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Jardin: Casa' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Jardin: Finca' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Personal' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Fitness' })
      ).toBeInTheDocument();
    });

    it('updates when option selected', () => {
      render(<AddTaskModal {...defaultProps} />);
      const typeSelect = screen.getByLabelText('Type') as HTMLSelectElement;
      fireEvent.change(typeSelect, { target: { value: 'personal' } });
      expect(typeSelect.value).toBe('personal');
    });
  });

  describe('Title input', () => {
    it('updates when typing', () => {
      render(<AddTaskModal {...defaultProps} />);
      const titleInput = screen.getByLabelText('Task') as HTMLInputElement;
      fireEvent.change(titleInput, { target: { value: 'My new task' } });
      expect(titleInput.value).toBe('My new task');
    });

    it('has autofocus', () => {
      render(<AddTaskModal {...defaultProps} />);
      const titleInput = screen.getByLabelText('Task');
      expect(document.activeElement).toBe(titleInput);
    });
  });

  describe('Status dropdown', () => {
    it('has all status options', () => {
      render(<AddTaskModal {...defaultProps} />);
      expect(screen.getByRole('option', { name: 'To-do' })).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'In progress' })
      ).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Done' })).toBeInTheDocument();
    });

    it('updates when option selected', () => {
      render(<AddTaskModal {...defaultProps} />);
      const statusSelect = screen.getByLabelText('Status') as HTMLSelectElement;
      fireEvent.change(statusSelect, { target: { value: 'in-progress' } });
      expect(statusSelect.value).toBe('in-progress');
    });
  });

  describe('Importance dropdown', () => {
    it('has all importance options', () => {
      render(<AddTaskModal {...defaultProps} />);
      expect(screen.getByRole('option', { name: 'High' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Mid' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Low' })).toBeInTheDocument();
    });

    it('updates when option selected', () => {
      render(<AddTaskModal {...defaultProps} />);
      const importanceSelect = screen.getByLabelText(
        'Importance'
      ) as HTMLSelectElement;
      fireEvent.change(importanceSelect, { target: { value: 'high' } });
      expect(importanceSelect.value).toBe('high');
    });
  });

  describe('Estimate', () => {
    it('selects estimate when preset clicked', () => {
      render(<AddTaskModal {...defaultProps} />);
      const btn15m = screen.getByRole('button', { name: '15m' });
      fireEvent.click(btn15m);
      // Preset should show selected state (bg-blue-500)
      expect(btn15m.className).toContain('bg-blue-500');
    });

    it('clears preset selection when different preset clicked', () => {
      render(<AddTaskModal {...defaultProps} />);
      const btn15m = screen.getByRole('button', { name: '15m' });
      const btn30m = screen.getByRole('button', { name: '30m' });
      fireEvent.click(btn15m);
      fireEvent.click(btn30m);
      // Check for selected state class directly (not in hover: variant)
      expect(btn15m.className).toContain('bg-hover');
      expect(btn30m.className).toMatch(/(?<!hover:)bg-blue-500/);
    });

    it('allows custom estimate input', () => {
      render(<AddTaskModal {...defaultProps} />);
      const customInput = screen.getByPlaceholderText(
        'Custom (min)'
      ) as HTMLInputElement;
      fireEvent.change(customInput, { target: { value: '45' } });
      expect(customInput.value).toBe('45');
    });

    it('clears preset when typing custom value', () => {
      render(<AddTaskModal {...defaultProps} />);
      const btn15m = screen.getByRole('button', { name: '15m' });
      fireEvent.click(btn15m);
      expect(btn15m.className).toMatch(/(?<!hover:)bg-blue-500/);

      const customInput = screen.getByPlaceholderText('Custom (min)');
      fireEvent.change(customInput, { target: { value: '45' } });
      // Preset should no longer be highlighted (since 45 !== 15)
      expect(btn15m.className).toContain('bg-hover');
    });

    it('clears custom input when preset clicked', () => {
      render(<AddTaskModal {...defaultProps} />);
      const customInput = screen.getByPlaceholderText(
        'Custom (min)'
      ) as HTMLInputElement;
      fireEvent.change(customInput, { target: { value: '45' } });
      expect(customInput.value).toBe('45');

      fireEvent.click(screen.getByRole('button', { name: '30m' }));
      expect(customInput.value).toBe('');
    });
  });

  describe('Date picker', () => {
    it('opens date picker when button clicked', () => {
      render(<AddTaskModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Select date...'));
      // DatePickerModal should be rendered - check for its dialog
      const dialogs = screen.getAllByRole('dialog');
      expect(dialogs.length).toBe(2); // AddTaskModal + DatePickerModal
    });

    it('updates date when selected', () => {
      render(<AddTaskModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Select date...'));
      // Click day 15 in the date picker
      fireEvent.click(screen.getByRole('button', { name: '15' }));
      // Date should now be displayed
      expect(screen.queryByText('Select date...')).not.toBeInTheDocument();
    });
  });

  describe('Create button validation', () => {
    it('is disabled when no fields are filled', () => {
      render(<AddTaskModal {...defaultProps} />);
      expect(screen.getByText('Create')).toBeDisabled();
    });

    it('is disabled when only type is filled', () => {
      render(<AddTaskModal {...defaultProps} />);
      fireEvent.change(screen.getByLabelText('Type'), {
        target: { value: 'admin' },
      });
      expect(screen.getByText('Create')).toBeDisabled();
    });

    it('is disabled when only title is filled', () => {
      render(<AddTaskModal {...defaultProps} />);
      fireEvent.change(screen.getByLabelText('Task'), {
        target: { value: 'Test' },
      });
      expect(screen.getByText('Create')).toBeDisabled();
    });

    it('is disabled when only importance is filled', () => {
      render(<AddTaskModal {...defaultProps} />);
      fireEvent.change(screen.getByLabelText('Importance'), {
        target: { value: 'high' },
      });
      expect(screen.getByText('Create')).toBeDisabled();
    });

    it('is disabled when only estimate is filled', () => {
      render(<AddTaskModal {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: '15m' }));
      expect(screen.getByText('Create')).toBeDisabled();
    });

    it('is disabled when type and title are filled but not importance or estimate', () => {
      render(<AddTaskModal {...defaultProps} />);
      fireEvent.change(screen.getByLabelText('Type'), {
        target: { value: 'admin' },
      });
      fireEvent.change(screen.getByLabelText('Task'), {
        target: { value: 'Test' },
      });
      expect(screen.getByText('Create')).toBeDisabled();
    });

    it('is disabled when type, title, importance filled but not estimate', () => {
      render(<AddTaskModal {...defaultProps} />);
      fireEvent.change(screen.getByLabelText('Type'), {
        target: { value: 'admin' },
      });
      fireEvent.change(screen.getByLabelText('Task'), {
        target: { value: 'Test' },
      });
      fireEvent.change(screen.getByLabelText('Importance'), {
        target: { value: 'high' },
      });
      expect(screen.getByText('Create')).toBeDisabled();
    });

    it('is enabled when type, title, importance, and estimate are filled', () => {
      render(<AddTaskModal {...defaultProps} />);
      fireEvent.change(screen.getByLabelText('Type'), {
        target: { value: 'admin' },
      });
      fireEvent.change(screen.getByLabelText('Task'), {
        target: { value: 'Test' },
      });
      fireEvent.change(screen.getByLabelText('Importance'), {
        target: { value: 'high' },
      });
      fireEvent.click(screen.getByRole('button', { name: '15m' }));
      expect(screen.getByText('Create')).not.toBeDisabled();
    });

    it('is enabled when using custom estimate', () => {
      render(<AddTaskModal {...defaultProps} />);
      fireEvent.change(screen.getByLabelText('Type'), {
        target: { value: 'admin' },
      });
      fireEvent.change(screen.getByLabelText('Task'), {
        target: { value: 'Test' },
      });
      fireEvent.change(screen.getByLabelText('Importance'), {
        target: { value: 'high' },
      });
      fireEvent.change(screen.getByPlaceholderText('Custom (min)'), {
        target: { value: '45' },
      });
      expect(screen.getByText('Create')).not.toBeDisabled();
    });

    it('is disabled when title is only whitespace', () => {
      render(<AddTaskModal {...defaultProps} />);
      fireEvent.change(screen.getByLabelText('Type'), {
        target: { value: 'admin' },
      });
      fireEvent.change(screen.getByLabelText('Task'), {
        target: { value: '   ' },
      });
      fireEvent.change(screen.getByLabelText('Importance'), {
        target: { value: 'high' },
      });
      fireEvent.click(screen.getByRole('button', { name: '15m' }));
      expect(screen.getByText('Create')).toBeDisabled();
    });
  });

  describe('form submission', () => {
    it('calls onSubmit with correct data when Create clicked', () => {
      render(<AddTaskModal {...defaultProps} />);
      fireEvent.change(screen.getByLabelText('Type'), {
        target: { value: 'personal' },
      });
      fireEvent.change(screen.getByLabelText('Task'), {
        target: { value: 'Buy groceries' },
      });
      fireEvent.change(screen.getByLabelText('Status'), {
        target: { value: 'in-progress' },
      });
      fireEvent.change(screen.getByLabelText('Importance'), {
        target: { value: 'mid' },
      });
      fireEvent.click(screen.getByRole('button', { name: '30m' }));

      fireEvent.click(screen.getByText('Create'));

      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'Buy groceries',
        type: 'personal',
        status: 'in-progress',
        importance: 'mid',
        estimate: 30,
        dueDate: undefined,
      });
    });

    it('includes custom estimate value', () => {
      render(<AddTaskModal {...defaultProps} />);
      fireEvent.change(screen.getByLabelText('Type'), {
        target: { value: 'admin' },
      });
      fireEvent.change(screen.getByLabelText('Task'), {
        target: { value: 'Custom estimate task' },
      });
      fireEvent.change(screen.getByLabelText('Importance'), {
        target: { value: 'high' },
      });
      fireEvent.change(screen.getByPlaceholderText('Custom (min)'), {
        target: { value: '45' },
      });

      fireEvent.click(screen.getByText('Create'));

      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          estimate: 45,
        })
      );
    });

    it('trims title whitespace on submit', () => {
      render(<AddTaskModal {...defaultProps} />);
      fireEvent.change(screen.getByLabelText('Type'), {
        target: { value: 'admin' },
      });
      fireEvent.change(screen.getByLabelText('Task'), {
        target: { value: '  Trimmed task  ' },
      });
      fireEvent.change(screen.getByLabelText('Importance'), {
        target: { value: 'low' },
      });
      fireEvent.click(screen.getByRole('button', { name: '15m' }));

      fireEvent.click(screen.getByText('Create'));

      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Trimmed task',
        })
      );
    });

    it('includes dueDate when date is selected', () => {
      render(<AddTaskModal {...defaultProps} />);
      fireEvent.change(screen.getByLabelText('Type'), {
        target: { value: 'admin' },
      });
      fireEvent.change(screen.getByLabelText('Task'), {
        target: { value: 'Task with date' },
      });
      fireEvent.change(screen.getByLabelText('Importance'), {
        target: { value: 'high' },
      });
      fireEvent.click(screen.getByRole('button', { name: '1h' }));

      // Open date picker and select a date
      fireEvent.click(screen.getByText('Select date...'));
      fireEvent.click(screen.getByRole('button', { name: '15' }));

      fireEvent.click(screen.getByText('Create'));

      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          dueDate: expect.any(Number),
        })
      );
    });

    it('submits with Enter key when form is valid', () => {
      render(<AddTaskModal {...defaultProps} />);
      fireEvent.change(screen.getByLabelText('Type'), {
        target: { value: 'admin' },
      });
      fireEvent.change(screen.getByLabelText('Importance'), {
        target: { value: 'high' },
      });
      fireEvent.click(screen.getByRole('button', { name: '15m' }));

      const titleInput = screen.getByLabelText('Task');
      fireEvent.change(titleInput, { target: { value: 'Task via Enter' } });
      fireEvent.keyDown(titleInput, { key: 'Enter' });

      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Task via Enter',
        })
      );
    });

    it('does not submit with Enter key when form is invalid', () => {
      render(<AddTaskModal {...defaultProps} />);
      const titleInput = screen.getByLabelText('Task');
      fireEvent.change(titleInput, { target: { value: 'Just title' } });
      fireEvent.keyDown(titleInput, { key: 'Enter' });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('close functionality', () => {
    it('calls onClose when Cancel clicked', () => {
      render(<AddTaskModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Cancel'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when backdrop clicked', () => {
      render(<AddTaskModal {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('Close modal'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when Escape key pressed', () => {
      render(<AddTaskModal {...defaultProps} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when X button clicked', () => {
      render(<AddTaskModal {...defaultProps} />);
      // The X button is inside the header, look for path element
      const closeButtons = screen
        .getAllByRole('button')
        .filter((btn) =>
          btn.querySelector('svg path[d="M5 5l10 10M15 5L5 15"]')
        );
      expect(closeButtons.length).toBeGreaterThan(0);
      fireEvent.click(closeButtons[0]);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('does not close when Escape pressed while date picker is open', () => {
      render(<AddTaskModal {...defaultProps} />);
      // Open date picker
      fireEvent.click(screen.getByText('Select date...'));

      // Press Escape - should close date picker, not main modal
      fireEvent.keyDown(document, { key: 'Escape' });

      // Modal should still be visible
      expect(screen.getByText('Add Task')).toBeInTheDocument();
      // Only one modal should remain
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });
});
