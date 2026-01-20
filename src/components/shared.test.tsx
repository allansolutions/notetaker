import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BackButton } from './BackButton';
import { Sidebar } from './Sidebar';
import {
  ChevronLeftIcon,
  DocumentIcon,
  DragHandleIcon,
  TrashIcon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
} from './icons';
import { ThemeProvider } from '../context/ThemeContext';
import { GoogleAuthProvider } from '../context/GoogleAuthContext';
import { Task } from '../types';

describe('BackButton', () => {
  it('renders with default label', () => {
    render(<BackButton onClick={() => {}} />);
    expect(screen.getByRole('button')).toHaveTextContent('Back');
  });

  it('renders with custom label', () => {
    render(<BackButton onClick={() => {}} label="Go Back" />);
    expect(screen.getByRole('button')).toHaveTextContent('Go Back');
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<BackButton onClick={onClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('renders chevron icon', () => {
    const { container } = render(<BackButton onClick={() => {}} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});

describe('Icons', () => {
  it('renders ChevronLeftIcon', () => {
    const { container } = render(<ChevronLeftIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('polyline')).toBeInTheDocument();
  });

  it('renders DocumentIcon', () => {
    const { container } = render(<DocumentIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('path')).toBeInTheDocument();
  });

  it('renders DragHandleIcon', () => {
    const { container } = render(<DragHandleIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelectorAll('circle')).toHaveLength(6);
  });

  it('renders TrashIcon', () => {
    const { container } = render(<TrashIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelectorAll('path')).toHaveLength(3);
  });

  it('renders SunIcon', () => {
    const { container } = render(<SunIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('circle')).toBeInTheDocument();
  });

  it('renders MoonIcon', () => {
    const { container } = render(<MoonIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('path')).toBeInTheDocument();
  });

  it('renders MonitorIcon', () => {
    const { container } = render(<MonitorIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('rect')).toBeInTheDocument();
  });
});

describe('Sidebar', () => {
  const createMockTask = (overrides: Partial<Task> = {}): Task => ({
    id: `task-${Date.now()}`,
    type: 'admin',
    title: 'Test Task',
    status: 'todo',
    importance: 'mid',
    blocks: [],
    startTime: 360,
    duration: 60,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    // Mock fetch for GoogleAuthProvider
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ isConnected: false }),
    } as Response);
    return render(
      <ThemeProvider>
        <GoogleAuthProvider>{ui}</GoogleAuthProvider>
      </ThemeProvider>
    );
  };

  it('renders Schedule header', () => {
    renderWithProviders(<Sidebar tasks={[]} onUpdateTask={() => {}} />);
    expect(screen.getByText('Schedule')).toBeInTheDocument();
  });

  it('renders ThemeToggle', () => {
    renderWithProviders(<Sidebar tasks={[]} onUpdateTask={() => {}} />);
    // ThemeToggle renders a single button that cycles through themes
    // Default is system theme
    expect(screen.getByTitle('Theme: System')).toBeInTheDocument();
  });

  it('renders Agenda', () => {
    renderWithProviders(<Sidebar tasks={[]} onUpdateTask={() => {}} />);
    expect(screen.getByTestId('agenda')).toBeInTheDocument();
  });

  it('passes tasks to Agenda', () => {
    const tasks = [createMockTask({ title: 'My Task' })];
    renderWithProviders(<Sidebar tasks={tasks} onUpdateTask={() => {}} />);

    // Task should be visible in agenda
    expect(screen.getByText('My Task')).toBeInTheDocument();
  });
});
