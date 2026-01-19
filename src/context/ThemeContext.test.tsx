import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';

function TestComponent() {
  const { mode, setMode, resolvedTheme } = useTheme();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setMode('light')}>Set Light</button>
      <button onClick={() => setMode('dark')}>Set Dark</button>
      <button onClick={() => setMode('system')}>Set System</button>
    </div>
  );
}

describe('ThemeContext', () => {
  let matchMediaMock: ReturnType<typeof vi.fn>;
  let addEventListenerMock: ReturnType<typeof vi.fn>;
  let removeEventListenerMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');

    addEventListenerMock = vi.fn();
    removeEventListenerMock = vi.fn();
    matchMediaMock = vi.fn((query) => ({
      matches: false, // default to light mode
      media: query,
      addEventListener: addEventListenerMock,
      removeEventListener: removeEventListenerMock,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    }));
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaMock,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to system theme', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('mode')).toHaveTextContent('system');
  });

  it('loads theme from localStorage', () => {
    localStorage.setItem('notetaker-theme', 'dark');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
  });

  it('changes mode when setMode is called', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    act(() => {
      screen.getByText('Set Light').click();
    });

    expect(screen.getByTestId('mode')).toHaveTextContent('light');
  });

  it('saves mode to localStorage', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    act(() => {
      screen.getByText('Set Dark').click();
    });

    expect(localStorage.getItem('notetaker-theme')).toBe('dark');
  });

  it('resolves system theme to light when system prefers light', () => {
    matchMediaMock = vi.fn(() => ({
      matches: false, // light mode
      addEventListener: addEventListenerMock,
      removeEventListener: removeEventListenerMock,
    }));
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaMock,
    });

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('resolved')).toHaveTextContent('light');
  });

  it('resolves system theme to dark when system prefers dark', () => {
    matchMediaMock = vi.fn(() => ({
      matches: true, // dark mode
      addEventListener: addEventListenerMock,
      removeEventListener: removeEventListenerMock,
    }));
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaMock,
    });

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
  });

  it('adds dark class to document when resolved theme is dark', () => {
    localStorage.setItem('notetaker-theme', 'dark');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('removes dark class when resolved theme is light', () => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('notetaker-theme', 'light');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('registers media query listener', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(addEventListenerMock).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    );
  });

  it('throws error when useTheme is used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useTheme must be used within a ThemeProvider');

    consoleSpy.mockRestore();
  });

  it('ignores invalid stored theme values', () => {
    localStorage.setItem('notetaker-theme', 'invalid');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('mode')).toHaveTextContent('system');
  });
});
