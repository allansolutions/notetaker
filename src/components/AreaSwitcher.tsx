import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ViewType } from '@/types';

type Area = 'tasks' | 'crm' | 'wiki';

interface AreaSwitcherProps {
  currentView: ViewType;
  onNavigateToTasks: () => void;
  onNavigateToCrm: () => void;
  onNavigateToWiki: () => void;
}

function getAreaFromView(view: ViewType): Area {
  if (view === 'crm-list' || view === 'crm-new' || view === 'crm-detail') {
    return 'crm';
  }
  if (view === 'wiki-list' || view === 'wiki-page') {
    return 'wiki';
  }
  return 'tasks';
}

export function AreaSwitcher({
  currentView,
  onNavigateToTasks,
  onNavigateToCrm,
  onNavigateToWiki,
}: AreaSwitcherProps) {
  const currentArea = getAreaFromView(currentView);

  const handleValueChange = (value: Area) => {
    if (value === 'tasks' && currentArea !== 'tasks') {
      onNavigateToTasks();
    } else if (value === 'crm' && currentArea !== 'crm') {
      onNavigateToCrm();
    } else if (value === 'wiki' && currentArea !== 'wiki') {
      onNavigateToWiki();
    }
  };

  return (
    <Select value={currentArea} onValueChange={handleValueChange}>
      <SelectTrigger
        size="sm"
        className="bg-surface border-border"
        data-testid="area-switcher"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="tasks">Task Manager</SelectItem>
        <SelectItem value="crm">CRM</SelectItem>
        <SelectItem value="wiki">Wiki</SelectItem>
      </SelectContent>
    </Select>
  );
}
