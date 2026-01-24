import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from './Sidebar';

vi.mock('./ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle">Theme Toggle</div>,
}));

vi.mock('./Agenda', () => ({
  Agenda: () => <div data-testid="agenda">Agenda</div>,
}));

vi.mock('./GoogleConnectButton', () => ({
  GoogleConnectButton: () => (
    <div data-testid="google-connect">Google Connect</div>
  ),
}));

vi.mock('./SettingsMenu', () => ({
  SettingsMenu: () => <div data-testid="settings-menu">Settings Menu</div>,
}));

describe('Sidebar', () => {
  const defaultProps = {
    tasks: [],
    calendarEvents: [],
    onUpdateTask: vi.fn(),
  };

  it('renders expanded state by default', () => {
    render(<Sidebar {...defaultProps} />);

    expect(screen.getByText('Schedule')).toBeInTheDocument();
    expect(screen.getByTestId('agenda')).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('google-connect')).toBeInTheDocument();
  });

  it('shows collapse button when expanded', () => {
    render(<Sidebar {...defaultProps} onToggleCollapse={vi.fn()} />);

    expect(
      screen.getByRole('button', { name: 'Collapse sidebar' })
    ).toBeInTheDocument();
  });

  it('calls onToggleCollapse when collapse button is clicked', async () => {
    const user = userEvent.setup();
    const onToggleCollapse = vi.fn();

    render(<Sidebar {...defaultProps} onToggleCollapse={onToggleCollapse} />);

    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }));

    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it('renders collapsed state when collapsed prop is true', () => {
    render(<Sidebar {...defaultProps} collapsed={true} />);

    expect(screen.queryByText('Schedule')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agenda')).not.toBeInTheDocument();
    expect(screen.queryByTestId('theme-toggle')).not.toBeInTheDocument();
  });

  it('shows expand button when collapsed', () => {
    render(
      <Sidebar {...defaultProps} collapsed={true} onToggleCollapse={vi.fn()} />
    );

    expect(
      screen.getByRole('button', { name: 'Expand sidebar' })
    ).toBeInTheDocument();
  });

  it('calls onToggleCollapse when expand button is clicked', async () => {
    const user = userEvent.setup();
    const onToggleCollapse = vi.fn();

    render(
      <Sidebar
        {...defaultProps}
        collapsed={true}
        onToggleCollapse={onToggleCollapse}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Expand sidebar' }));

    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
  });
});
