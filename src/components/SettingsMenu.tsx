import { Settings, Download, LogOut } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || '';

export function SettingsMenu() {
  const { user, logout } = useAuth();

  const handleExport = async () => {
    try {
      const response = await fetch(`${API_URL}/api/export`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notetaker-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="size-6 flex items-center justify-center text-muted rounded-md hover:bg-hover hover:text-primary transition-colors duration-normal"
          title="Settings"
          aria-label="Settings"
        >
          <Settings size={16} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        {user?.email && (
          <div className="px-2 py-1.5 text-xs text-muted truncate border-b border-border mb-2">
            {user.email}
          </div>
        )}
        <button
          type="button"
          onClick={handleExport}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-hover transition-colors text-left"
        >
          <Download size={16} />
          Export Data
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-destructive/10 text-destructive transition-colors text-left"
        >
          <LogOut size={16} />
          Logout
        </button>
      </PopoverContent>
    </Popover>
  );
}
