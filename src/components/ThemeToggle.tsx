import { useTheme } from '../context/ThemeContext';
import { SunIcon, MoonIcon, MonitorIcon } from './icons';

type ThemeMode = 'light' | 'dark' | 'system';

const modeOrder: ThemeMode[] = ['system', 'light', 'dark'];

const modeLabels: Record<ThemeMode, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

const modeIcons: Record<ThemeMode, () => JSX.Element> = {
  system: MonitorIcon,
  light: SunIcon,
  dark: MoonIcon,
};

export function ThemeToggle() {
  const { mode, setMode } = useTheme();

  const cycleMode = () => {
    const currentIndex = modeOrder.indexOf(mode);
    const nextIndex = (currentIndex + 1) % modeOrder.length;
    setMode(modeOrder[nextIndex]);
  };

  const Icon = modeIcons[mode];

  return (
    <button
      onClick={cycleMode}
      className="size-6 flex items-center justify-center text-muted rounded-md hover:bg-hover hover:text-primary transition-colors duration-normal"
      title={`Theme: ${modeLabels[mode]}`}
    >
      <Icon />
    </button>
  );
}
