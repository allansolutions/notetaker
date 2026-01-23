/**
 * ModuleSidebar Component
 *
 * Displays navigation tabs for switching between modules (Tasks, CRM, Wiki).
 * This is placed above the module-specific sidebar content.
 */

import { CheckSquare, Users, FileText } from 'lucide-react';
import type { Module } from '../types';
import { cn } from '@/lib/utils';

interface ModuleSidebarProps {
  currentModule: Module;
  onModuleChange: (module: Module) => void;
  collapsed?: boolean;
}

interface ModuleTab {
  id: Module;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
}

const MODULE_TABS: ModuleTab[] = [
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, enabled: true },
  { id: 'crm', label: 'CRM', icon: Users, enabled: false },
  { id: 'wiki', label: 'Wiki', icon: FileText, enabled: false },
];

export function ModuleSidebar({
  currentModule,
  onModuleChange,
  collapsed = false,
}: ModuleSidebarProps) {
  return (
    <nav className="flex flex-col gap-1 p-2 border-b border-border">
      {MODULE_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentModule === tab.id;
        const isDisabled = !tab.enabled;

        return (
          <button
            key={tab.id}
            onClick={() => !isDisabled && onModuleChange(tab.id)}
            disabled={isDisabled}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive && 'bg-accent text-accent-foreground',
              !isActive &&
                !isDisabled &&
                'hover:bg-accent/50 text-muted-foreground',
              isDisabled &&
                'opacity-50 cursor-not-allowed text-muted-foreground'
            )}
            title={isDisabled ? `${tab.label} (Coming soon)` : tab.label}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && (
              <>
                <span>{tab.label}</span>
                {isDisabled && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    Soon
                  </span>
                )}
              </>
            )}
          </button>
        );
      })}
    </nav>
  );
}
