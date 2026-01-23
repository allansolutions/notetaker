/**
 * AppLayout Component
 *
 * Main application layout with module navigation and sidebar.
 * Provides the structural wrapper for all module content.
 */

import { ReactNode, useState, useCallback, useEffect, useRef } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ModuleSidebar } from './ModuleSidebar';
import type { Module } from '../types';

const SIDEBAR_WIDTH_KEY = 'notetaker-sidebar-width';
const SIDEBAR_COLLAPSED_KEY = 'notetaker-sidebar-collapsed';
const DEFAULT_SIDEBAR_WIDTH = 240;
const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 500;
const COLLAPSED_SIDEBAR_WIDTH = 48;

interface AppLayoutProps {
  children: ReactNode;
  currentModule: Module;
  onModuleChange: (module: Module) => void;
  sidebarContent?: ReactNode;
  /** Whether to use wide content width (for table views) */
  wideContent?: boolean;
}

export function AppLayout({
  children,
  currentModule,
  onModuleChange,
  sidebarContent,
  wideContent = false,
}: AppLayoutProps) {
  const [sidebarWidth, setSidebarWidth] = useLocalStorage<number>(
    SIDEBAR_WIDTH_KEY,
    DEFAULT_SIDEBAR_WIDTH
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage<boolean>(
    SIDEBAR_COLLAPSED_KEY,
    false
  );
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const delta = resizeRef.current.startX - e.clientX;
      const newWidth = Math.min(
        MAX_SIDEBAR_WIDTH,
        Math.max(MIN_SIDEBAR_WIDTH, resizeRef.current.startWidth + delta)
      );
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setSidebarWidth]);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizeRef.current = { startX: e.clientX, startWidth: sidebarWidth };
      setIsResizing(true);
    },
    [sidebarWidth]
  );

  const handleToggleCollapse = useCallback(() => {
    setSidebarCollapsed(!sidebarCollapsed);
  }, [sidebarCollapsed, setSidebarCollapsed]);

  return (
    <div
      className={`flex min-h-screen ${isResizing ? 'select-none cursor-col-resize' : ''}`}
    >
      {/* Main content area */}
      <div
        className={`flex-1 mx-auto py-20 px-24 ${
          wideContent
            ? 'max-w-[var(--width-content-wide)]'
            : 'max-w-[var(--width-content)]'
        }`}
      >
        {children}
      </div>

      {/* Sidebar */}
      <div
        data-testid="sidebar"
        className="shrink-0 bg-surface-alt sticky top-0 h-screen overflow-y-auto flex"
        style={{
          width: sidebarCollapsed ? COLLAPSED_SIDEBAR_WIDTH : sidebarWidth,
        }}
      >
        {/* Resize handle */}
        {!sidebarCollapsed && (
          <>
            {/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- Interactive separator (splitter) pattern */}
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize sidebar"
              tabIndex={0}
              data-testid="sidebar-resize-handle"
              onMouseDown={handleResizeStart}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  setSidebarWidth((w) => Math.min(MAX_SIDEBAR_WIDTH, w + 10));
                } else if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  setSidebarWidth((w) => Math.max(MIN_SIDEBAR_WIDTH, w - 10));
                }
              }}
              className="w-1 shrink-0 cursor-col-resize border-l border-border hover:bg-accent-subtle active:bg-accent-subtle transition-colors focus:bg-accent-subtle focus:outline-none"
            />
            {/* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
          </>
        )}

        {/* Sidebar content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Module navigation tabs */}
          <ModuleSidebar
            currentModule={currentModule}
            onModuleChange={onModuleChange}
            collapsed={sidebarCollapsed}
          />

          {/* Module-specific sidebar content */}
          <div className="flex-1 overflow-y-auto">{sidebarContent}</div>

          {/* Collapse toggle button */}
          <button
            onClick={handleToggleCollapse}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors border-t border-border"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>
      </div>
    </div>
  );
}
