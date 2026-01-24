import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddTaskModal } from './AddTaskModal';

// Mock useAuth
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-1', email: 'test@example.com', name: 'Test User' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

// Mock useTeam
vi.mock('@/modules/teams/context/TeamContext', () => ({
  useTeam: () => ({
    teams: [],
    activeTeam: null,
    members: [],
    userRole: null,
    isLoading: false,
    error: null,
    setActiveTeam: vi.fn(),
    createTeam: vi.fn(),
    updateTeam: vi.fn(),
    deleteTeam: vi.fn(),
    inviteMember: vi.fn(),
    removeMember: vi.fn(),
    refreshTeams: vi.fn(),
    refreshMembers: vi.fn(),
  }),
}));

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

  // Helper to select a type from the auto-opened dropdown
  async function selectType(
    user: ReturnType<typeof userEvent.setup>,
    typeName: string
  ) {
    const option = await screen.findByRole('option', { name: typeName });
    await user.click(option);
    // Wait for dropdown to close
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  }

  // Helper to open and select from a dropdown
  async function selectFromDropdown(
    user: ReturnType<typeof userEvent.setup>,
    triggerName: RegExp,
    optionName: string
  ) {
    const trigger = screen.getByRole('combobox', { name: triggerName });
    await user.click(trigger);
    const option = await screen.findByRole('option', { name: optionName });
    await user.click(option);
    // Wait for the selected value to appear in the trigger
    // (can't wait for listbox to close because another dropdown might auto-open)
    await waitFor(() => {
      expect(within(trigger).getByText(optionName)).toBeInTheDocument();
    });
  }

  // Helper to fill all required fields
  async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
    // Type dropdown auto-opens on modal open
    await selectType(user, 'Admin');

    // Title
    const titleInput = screen.getByLabelText('Task');
    await user.type(titleInput, 'Test task');

    // Importance
    await selectFromDropdown(user, /Importance/i, 'High');

    // Estimate
    const estimateInput = screen.getByLabelText('Estimate');
    await user.type(estimateInput, '30m');
  }

  // Helper to close the auto-opened type dropdown without selecting
  async function closeTypeDropdown(user: ReturnType<typeof userEvent.setup>) {
    // Wait for dropdown to be open first
    await screen.findByRole('listbox');
    // Press Escape to close the dropdown
    await user.keyboard('{Escape}');
    // Wait for dropdown to close
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  }

  describe('rendering', () => {
    it('renders modal with title', () => {
      render(<AddTaskModal {...defaultProps} />);
      expect(screen.getByText('Add Task')).toBeInTheDocument();
    });

    it('renders all form fields', () => {
      render(<AddTaskModal {...defaultProps} />);
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Task')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Importance')).toBeInTheDocument();
      expect(screen.getByText('Estimate')).toBeInTheDocument();
      expect(screen.getByText('Date')).toBeInTheDocument();
    });

    it('renders estimate text input with MH format placeholder', () => {
      render(<AddTaskModal {...defaultProps} />);
      expect(
        screen.getByPlaceholderText('e.g., 30m, 1h 30m')
      ).toBeInTheDocument();
    });

    it('renders Create and Cancel buttons', () => {
      render(<AddTaskModal {...defaultProps} />);
      expect(screen.getByText('Create')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('has Type dropdown with placeholder', () => {
      render(<AddTaskModal {...defaultProps} />);
      expect(screen.getByText('Select type...')).toBeInTheDocument();
    });

    it('has Status dropdown defaulting to todo', () => {
      render(<AddTaskModal {...defaultProps} />);
      expect(screen.getByText('To-do')).toBeInTheDocument();
    });

    it('has Importance dropdown with placeholder', () => {
      render(<AddTaskModal {...defaultProps} />);
      expect(screen.getByText('Select importance...')).toBeInTheDocument();
    });

    it('has Date defaulting to today', () => {
      render(<AddTaskModal {...defaultProps} />);
      const today = new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      expect(screen.getByText(today)).toBeInTheDocument();
    });
  });

  describe('Type dropdown', () => {
    it('has all type options when opened', async () => {
      render(<AddTaskModal {...defaultProps} />);

      // Type dropdown auto-opens, so options should be visible
      expect(
        await screen.findByRole('option', { name: 'Admin' })
      ).toBeInTheDocument();
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

    it('updates when option selected', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      await selectType(user, 'Personal');

      // Check that the trigger now shows "Personal"
      const typeTrigger = screen.getByRole('combobox', { name: /Type/i });
      expect(within(typeTrigger).getByText('Personal')).toBeInTheDocument();
    });
  });

  describe('Title input', () => {
    it('updates when typing', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      await closeTypeDropdown(user);

      const titleInput = screen.getByLabelText('Task') as HTMLInputElement;
      await user.type(titleInput, 'My new task');
      expect(titleInput.value).toBe('My new task');
    });
  });

  describe('Status dropdown', () => {
    it('has all status options when opened', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      await closeTypeDropdown(user);

      const statusTrigger = screen.getByRole('combobox', { name: /Status/i });
      await user.click(statusTrigger);

      expect(
        await screen.findByRole('option', { name: 'To-do' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'In progress' })
      ).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Done' })).toBeInTheDocument();
    });

    it('updates when option selected', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      await closeTypeDropdown(user);
      await selectFromDropdown(user, /Status/i, 'In progress');

      const statusTrigger = screen.getByRole('combobox', { name: /Status/i });
      expect(
        within(statusTrigger).getByText('In progress')
      ).toBeInTheDocument();
    });
  });

  describe('Importance dropdown', () => {
    it('has all importance options when opened', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      await closeTypeDropdown(user);

      const importanceTrigger = screen.getByRole('combobox', {
        name: /Importance/i,
      });
      await user.click(importanceTrigger);

      expect(
        await screen.findByRole('option', { name: 'High' })
      ).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Mid' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Low' })).toBeInTheDocument();
    });

    it('updates when option selected', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      await closeTypeDropdown(user);
      await selectFromDropdown(user, /Importance/i, 'Mid');

      const importanceTrigger = screen.getByRole('combobox', {
        name: /Importance/i,
      });
      expect(within(importanceTrigger).getByText('Mid')).toBeInTheDocument();
    });
  });

  describe('Estimate', () => {
    it('accepts MH format input', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      await closeTypeDropdown(user);

      const estimateInput = screen.getByLabelText(
        'Estimate'
      ) as HTMLInputElement;
      await user.type(estimateInput, '1h 30m');
      expect(estimateInput.value).toBe('1h 30m');
    });

    it('displays formatted value when valid input', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      await closeTypeDropdown(user);

      const estimateInput = screen.getByLabelText('Estimate');
      await user.type(estimateInput, '90');

      expect(screen.getByText('= 1h 30m')).toBeInTheDocument();
    });

    it('parses hours-only format', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      await closeTypeDropdown(user);

      const estimateInput = screen.getByLabelText('Estimate');
      await user.type(estimateInput, '2h');

      expect(screen.getByText('= 2h')).toBeInTheDocument();
    });

    it('parses combined hours and minutes', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      await closeTypeDropdown(user);

      const estimateInput = screen.getByLabelText('Estimate');
      await user.type(estimateInput, '2h 30m');

      expect(screen.getByText('= 2h 30m')).toBeInTheDocument();
    });
  });

  describe('Date picker', () => {
    it('opens date picker when button clicked', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      await closeTypeDropdown(user);

      // Find the date button by its aria-labelledby
      const dateButton = screen.getByRole('button', { name: /Date/i });
      await user.click(dateButton);

      // DatePickerModal should be rendered
      const dialogs = screen.getAllByRole('dialog');
      expect(dialogs.length).toBe(2); // AddTaskModal + DatePickerModal
    });

    it('updates date when selected', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      await closeTypeDropdown(user);

      const dateButton = screen.getByRole('button', { name: /Date/i });
      await user.click(dateButton);

      // Click day 15 in the date picker
      await user.click(screen.getByRole('button', { name: '15' }));

      // Date picker should close and date should be updated
      await waitFor(() => {
        expect(screen.getAllByRole('dialog')).toHaveLength(1);
      });
    });
  });

  describe('Create button validation', () => {
    it('is disabled when no fields are filled', () => {
      render(<AddTaskModal {...defaultProps} />);
      expect(screen.getByText('Create')).toBeDisabled();
    });

    it('is disabled when only type is filled', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      await selectType(user, 'Admin');

      expect(screen.getByText('Create')).toBeDisabled();
    });

    it('is disabled when only title is filled', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      await closeTypeDropdown(user);

      await user.type(screen.getByLabelText('Task'), 'Test');
      expect(screen.getByText('Create')).toBeDisabled();
    });

    it('is disabled when only importance is filled', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      await closeTypeDropdown(user);
      await selectFromDropdown(user, /Importance/i, 'High');

      expect(screen.getByText('Create')).toBeDisabled();
    });

    it('is disabled when only estimate is filled', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      await closeTypeDropdown(user);

      await user.type(screen.getByLabelText('Estimate'), '30m');
      expect(screen.getByText('Create')).toBeDisabled();
    });

    it('is disabled when type and title are filled but not importance or estimate', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      await selectType(user, 'Admin');
      await user.type(screen.getByLabelText('Task'), 'Test');

      expect(screen.getByText('Create')).toBeDisabled();
    });

    it('is disabled when type, title, importance filled but not estimate', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      await selectType(user, 'Admin');
      await user.type(screen.getByLabelText('Task'), 'Test');
      await selectFromDropdown(user, /Importance/i, 'High');

      expect(screen.getByText('Create')).toBeDisabled();
    });

    it('is enabled when type, title, importance, and estimate are filled', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      await fillRequiredFields(user);

      expect(screen.getByText('Create')).not.toBeDisabled();
    });

    it('is disabled when title is only whitespace', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      await selectType(user, 'Admin');
      await user.type(screen.getByLabelText('Task'), '   ');
      await selectFromDropdown(user, /Importance/i, 'High');
      await user.type(screen.getByLabelText('Estimate'), '30m');

      expect(screen.getByText('Create')).toBeDisabled();
    });
  });

  describe('form submission', () => {
    it('calls onSubmit with correct data when Create clicked', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      // Fill all fields
      await selectType(user, 'Personal');
      await user.type(screen.getByLabelText('Task'), 'Buy groceries');
      await selectFromDropdown(user, /Status/i, 'In progress');
      await selectFromDropdown(user, /Importance/i, 'Mid');
      await user.type(screen.getByLabelText('Estimate'), '30m');

      await user.click(screen.getByText('Create'));

      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'Buy groceries',
        type: 'personal',
        status: 'in-progress',
        importance: 'mid',
        estimate: 30,
        dueDate: expect.any(Number), // Today's date
        assigneeId: 'test-user-1', // Current user
      });
    });

    it('includes MH format estimate value', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      await selectType(user, 'Admin');
      await user.type(screen.getByLabelText('Task'), 'Task with hours');
      await selectFromDropdown(user, /Importance/i, 'High');
      await user.type(screen.getByLabelText('Estimate'), '1h 30m');

      await user.click(screen.getByText('Create'));

      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          estimate: 90,
        })
      );
    });

    it('trims title whitespace on submit', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      await selectType(user, 'Admin');
      await user.type(screen.getByLabelText('Task'), '  Trimmed task  ');
      await selectFromDropdown(user, /Importance/i, 'Low');
      await user.type(screen.getByLabelText('Estimate'), '15m');

      await user.click(screen.getByText('Create'));

      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Trimmed task',
        })
      );
    });

    it('includes dueDate defaulting to today', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      await selectType(user, 'Admin');
      await user.type(screen.getByLabelText('Task'), 'Task with date');
      await selectFromDropdown(user, /Importance/i, 'High');
      await user.type(screen.getByLabelText('Estimate'), '1h');

      await user.click(screen.getByText('Create'));

      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          dueDate: expect.any(Number),
        })
      );

      // Verify it's today
      const callArgs = mockOnSubmit.mock.calls[0][0];
      const dueDate = new Date(callArgs.dueDate);
      const today = new Date();
      expect(dueDate.getDate()).toBe(today.getDate());
      expect(dueDate.getMonth()).toBe(today.getMonth());
      expect(dueDate.getFullYear()).toBe(today.getFullYear());
    });

    it('does not submit with Enter key when form is invalid', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      await closeTypeDropdown(user);

      const titleInput = screen.getByLabelText('Task');
      await user.type(titleInput, 'Just title');
      await user.keyboard('{Enter}');

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('close functionality', () => {
    it('calls onClose when Cancel clicked', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      await closeTypeDropdown(user);

      await user.click(screen.getByText('Cancel'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when backdrop clicked', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      // Close the auto-opened dropdown first
      await closeTypeDropdown(user);

      await user.click(screen.getByLabelText('Close modal'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when Escape key pressed with dropdown closed', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      await closeTypeDropdown(user);
      await user.keyboard('{Escape}');

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when X button clicked', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      // Close the auto-opened dropdown first (otherwise body has pointer-events: none)
      await closeTypeDropdown(user);

      const closeButtons = screen
        .getAllByRole('button')
        .filter((btn) =>
          btn.querySelector('svg path[d="M5 5l10 10M15 5L5 15"]')
        );
      expect(closeButtons.length).toBeGreaterThan(0);
      await user.click(closeButtons[0]);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('keeps modal open after date picker closes', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      await closeTypeDropdown(user);

      // Open date picker
      const dateButton = screen.getByRole('button', { name: /Date/i });
      await user.click(dateButton);

      // Wait for date picker modal to be visible
      await waitFor(() => {
        expect(screen.getAllByRole('dialog')).toHaveLength(2);
      });

      // Close date picker by selecting a date
      await user.click(screen.getByRole('button', { name: '15' }));

      // Wait for date picker to close
      await waitFor(() => {
        expect(screen.getAllByRole('dialog')).toHaveLength(1);
      });

      // Modal should still be visible
      expect(screen.getByText('Add Task')).toBeInTheDocument();
    });
  });

  describe('keyboard flow', () => {
    it('Type dropdown auto-opens on modal open', async () => {
      render(<AddTaskModal {...defaultProps} />);

      // Type options should be visible immediately
      expect(
        await screen.findByRole('option', { name: 'Admin' })
      ).toBeInTheDocument();
    });

    it('Title receives focus after Type selection', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      await selectType(user, 'Admin');

      await waitFor(() => {
        expect(screen.getByLabelText('Task')).toHaveFocus();
      });
    });

    it('Enter in title advances to Status dropdown', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      await selectType(user, 'Admin');

      const titleInput = screen.getByLabelText('Task');
      await user.type(titleInput, 'Test task');
      await user.keyboard('{Enter}');

      // Status dropdown should be focused
      await waitFor(() => {
        const statusTrigger = screen.getByRole('combobox', { name: /Status/i });
        expect(statusTrigger).toHaveFocus();
      });
    });

    it('Enter in estimate advances to Date field', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      await closeTypeDropdown(user);

      const estimateInput = screen.getByLabelText('Estimate');
      await user.type(estimateInput, '30m');
      await user.keyboard('{Enter}');

      // Date button should be focused
      await waitFor(() => {
        const dateButton = screen.getByRole('button', { name: /Date/i });
        expect(dateButton).toHaveFocus();
      });
    });

    it('Enter on Date field submits when form is valid', async () => {
      const user = userEvent.setup();
      render(<AddTaskModal {...defaultProps} />);

      await fillRequiredFields(user);

      // Focus the date button
      const dateButton = screen.getByRole('button', { name: /Date/i });
      dateButton.focus();

      // Press Enter to submit
      await user.keyboard('{Enter}');

      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });
});
