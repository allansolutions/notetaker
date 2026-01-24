import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from './ThemeToggle';

const mockSetMode = vi.fn();
let mockMode = 'system';

vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({
    get mode() {
      return mockMode;
    },
    setMode: mockSetMode,
  }),
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    mockMode = 'system';
    mockSetMode.mockClear();
  });

  it('renders with system icon by default', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button')).toHaveAttribute(
      'title',
      'Theme: System'
    );
  });

  it('cycles to light mode on click from system', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockSetMode).toHaveBeenCalledWith('light');
  });

  it('cycles to dark mode on click from light', () => {
    mockMode = 'light';
    render(<ThemeToggle />);
    expect(screen.getByRole('button')).toHaveAttribute('title', 'Theme: Light');
    fireEvent.click(screen.getByRole('button'));
    expect(mockSetMode).toHaveBeenCalledWith('dark');
  });

  it('cycles to system mode on click from dark', () => {
    mockMode = 'dark';
    render(<ThemeToggle />);
    expect(screen.getByRole('button')).toHaveAttribute('title', 'Theme: Dark');
    fireEvent.click(screen.getByRole('button'));
    expect(mockSetMode).toHaveBeenCalledWith('system');
  });
});
