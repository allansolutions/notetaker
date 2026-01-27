import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Task, DateRange } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { BackButton } from '../BackButton';
import { DateRangeModal } from '../DateRangeModal';
import {
  DashboardPreset,
  getPresetDateRange,
  clampRangeToAccountStart,
  aggregateCompletionsByDay,
  computeDashboardStats,
} from '../../utils/dashboard-stats';

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

  // Determine tick interval to avoid crowding
  let tickInterval = 0;
  if (points.length > 60) tickInterval = 6;
  else if (points.length > 14) tickInterval = 2;

  return (
    <div className="flex flex-col h-full">
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

      {/* Chart */}
      <div className="flex-1 min-h-[300px]">
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
