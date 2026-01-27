import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Task, DateRange, TASK_TYPE_OPTIONS, TaskType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { BackButton } from '../BackButton';
import { DateRangeModal } from '../DateRangeModal';
import {
  DashboardPreset,
  getPresetDateRange,
  clampRangeToAccountStart,
  aggregateCompletionsByDay,
  computeDashboardStats,
  aggregateTimeByCategory,
  CATEGORY_CHART_COLORS,
} from '../../utils/dashboard-stats';
import { formatMinutes } from '../../utils/task-operations';

interface DashboardViewProps {
  tasks: Task[];
  onBack: () => void;
}

const PRESETS: { key: DashboardPreset | 'custom'; label: string }[] = [
  { key: 'this-week', label: 'This Week' },
  { key: 'this-month', label: 'This Month' },
  { key: 'last-month', label: 'Last Month' },
  { key: 'this-quarter', label: 'This Quarter' },
  { key: 'this-year', label: 'This Year' },
  { key: 'custom', label: 'Custom' },
];

export function DashboardView({ tasks, onBack }: DashboardViewProps) {
  const { user } = useAuth();
  const [activePreset, setActivePreset] = useState<DashboardPreset | 'custom'>(
    'this-month'
  );
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [isRangeModalOpen, setIsRangeModalOpen] = useState(false);

  const range = useMemo(() => {
    let r: { start: Date; end: Date };
    if (activePreset === 'custom' && customRange) {
      r = {
        start: new Date(customRange.start),
        end: new Date(customRange.end),
      };
    } else if (activePreset !== 'custom') {
      r = getPresetDateRange(activePreset);
    } else {
      r = getPresetDateRange('this-month');
    }
    // Don't include days before the account existed
    if (user?.createdAt) {
      r = clampRangeToAccountStart(r, user.createdAt);
    }
    return r;
  }, [activePreset, customRange, user?.createdAt]);

  const points = useMemo(
    () => aggregateCompletionsByDay(tasks, range),
    [tasks, range]
  );

  const stats = useMemo(
    () => computeDashboardStats(tasks, points),
    [tasks, points]
  );

  const timePoints = useMemo(
    () => aggregateTimeByCategory(tasks, range),
    [tasks, range]
  );

  const handlePresetClick = (key: DashboardPreset | 'custom') => {
    setActivePreset(key);
    if (key === 'custom') {
      setIsRangeModalOpen(true);
    }
  };

  const handleCustomRangeChange = (range: DateRange | null) => {
    setCustomRange(range);
    if (range) {
      setActivePreset('custom');
    }
  };

  // Determine tick intervals to avoid crowding
  let tickInterval = 0;
  if (points.length > 60) tickInterval = 6;
  else if (points.length > 14) tickInterval = 2;

  let timeTickInterval = 0;
  if (timePoints.length > 60) timeTickInterval = 6;
  else if (timePoints.length > 14) timeTickInterval = 2;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <BackButton onClick={onBack} />
        <h1 className="text-lg font-semibold text-primary">Dashboard</h1>
      </div>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {PRESETS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => handlePresetClick(key)}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              activePreset === key
                ? 'bg-blue-500 text-white'
                : 'bg-surface-alt text-muted hover:text-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Completed"
          value={String(stats.totalCompleted)}
        />
        <StatCard label="Avg / Day" value={String(stats.avgPerDay)} />
        <StatCard
          label="Peak Day"
          value={stats.peakDay || '—'}
          subtitle={
            stats.peakDay
              ? `${points.find((p) => p.dateLabel === stats.peakDay)?.count ?? 0} tasks`
              : undefined
          }
        />
        <StatCard label="Undated" value={String(stats.undatedCount)} />
      </div>

      {/* Task Completions chart */}
      <h2 className="text-sm font-medium text-muted mb-2">Task Completions</h2>
      <div className="h-[300px] mb-8">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={points}
            margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
              interval={tickInterval}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
              width={30}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--color-primary)',
              }}
              labelStyle={{ color: 'var(--color-muted)' }}
            />
            <Line
              type="monotone"
              dataKey="count"
              name="Completed"
              stroke="var(--color-accent)"
              strokeWidth={2}
              dot={points.length <= 31}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Time by Category chart */}
      <h2 className="text-sm font-medium text-muted mb-2">Time by Category</h2>
      <div className="h-[300px] mb-8">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={timePoints}
            margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
              interval={timeTickInterval}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
              width={40}
              tickFormatter={(value: number) =>
                value >= 60 ? `${Math.round(value / 60)}h` : `${value}m`
              }
            />
            <Tooltip content={<TimeCategoryTooltip />} />
            {TASK_TYPE_OPTIONS.map(({ value }) => (
              <Bar
                key={value}
                dataKey={value}
                stackId="time"
                fill={CATEGORY_CHART_COLORS[value]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Custom range modal */}
      {isRangeModalOpen && (
        <DateRangeModal
          value={customRange}
          onChange={handleCustomRangeChange}
          onClose={() => setIsRangeModalOpen(false)}
        />
      )}
    </div>
  );
}

const CATEGORY_LABELS: Record<TaskType, string> = Object.fromEntries(
  TASK_TYPE_OPTIONS.map(({ value, label }) => [value, label])
) as Record<TaskType, string>;

function TimeCategoryTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number; fill: string }[];
  label?: string;
}) {
  if (!active || !payload) return null;

  const nonZero = payload.filter((p) => p.value > 0);
  if (nonZero.length === 0) return null;

  const total = nonZero.reduce((sum, p) => sum + p.value, 0);

  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        color: 'var(--color-primary)',
      }}
    >
      <div className="text-muted mb-1">{label}</div>
      {nonZero.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.fill }}
          />
          <span>{CATEGORY_LABELS[entry.dataKey as TaskType]}</span>
          <span className="ml-auto font-medium">
            {formatMinutes(entry.value)}
          </span>
        </div>
      ))}
      {nonZero.length > 1 && (
        <div
          className="flex items-center gap-2 border-t mt-1 pt-1"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <span className="font-medium">Total</span>
          <span className="ml-auto font-medium">{formatMinutes(total)}</span>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-surface-alt rounded-lg p-4">
      <div className="text-xs text-muted mb-1">{label}</div>
      <div className="text-xl font-semibold text-primary">{value}</div>
      {subtitle && <div className="text-xs text-muted mt-0.5">{subtitle}</div>}
    </div>
  );
}
