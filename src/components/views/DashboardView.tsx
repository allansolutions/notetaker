import { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
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
  DashboardGranularity,
  getPresetDateRange,
  clampRangeToAccountStart,
  aggregateCompletions,
  computeDashboardStats,
  aggregateTimeByCategory,
  aggregateDelays,
  getPermittedGranularities,
  getDefaultGranularity,
  CATEGORY_CHART_COLORS,
  type DateChange,
} from '../../utils/dashboard-stats';
import { analyticsApi } from '../../api/client';
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

const GRANULARITY_OPTIONS: { key: DashboardGranularity; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

export function DashboardView({ tasks, onBack }: DashboardViewProps) {
  const { user } = useAuth();
  const [activePreset, setActivePreset] = useState<DashboardPreset | 'custom'>(
    'this-month'
  );
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [isRangeModalOpen, setIsRangeModalOpen] = useState(false);
  const [granularity, setGranularity] = useState<DashboardGranularity>('daily');

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

  const permitted = useMemo(() => getPermittedGranularities(range), [range]);

  useEffect(() => {
    setGranularity(getDefaultGranularity(range));
  }, [range]);

  // Daily points always used for stats (avg/day, peak day)
  const dailyPoints = useMemo(
    () => aggregateCompletions(tasks, range),
    [tasks, range]
  );

  const chartPoints = useMemo(
    () =>
      granularity === 'daily'
        ? dailyPoints
        : aggregateCompletions(tasks, range, granularity),
    [tasks, range, granularity, dailyPoints]
  );

  const stats = useMemo(
    () => computeDashboardStats(tasks, dailyPoints),
    [tasks, dailyPoints]
  );

  const timePoints = useMemo(
    () => aggregateTimeByCategory(tasks, range, granularity),
    [tasks, range, granularity]
  );

  // Fetch date changes from API
  const [dateChanges, setDateChanges] = useState<DateChange[]>([]);
  useEffect(() => {
    let cancelled = false;
    analyticsApi
      .getDateChanges(range.start.getTime(), range.end.getTime())
      .then((changes) => {
        if (!cancelled) setDateChanges(changes);
      })
      .catch(() => {
        if (!cancelled) setDateChanges([]);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const delayPoints = useMemo(
    () => aggregateDelays(dateChanges, range, granularity),
    [dateChanges, range, granularity]
  );

  const totalDelays = useMemo(
    () => delayPoints.reduce((sum, p) => sum + p.count, 0),
    [delayPoints]
  );

  const daysInRange = dailyPoints.length || 1;

  const topCategory = useMemo(() => {
    const totals: Partial<Record<TaskType, number>> = {};
    for (const point of timePoints) {
      for (const opt of TASK_TYPE_OPTIONS) {
        const key = opt.value;
        totals[key] = (totals[key] ?? 0) + point[key];
      }
    }
    let maxKey: TaskType | null = null;
    let maxVal = 0;
    for (const opt of TASK_TYPE_OPTIONS) {
      const val = totals[opt.value] ?? 0;
      if (val > maxVal) {
        maxKey = opt.value;
        maxVal = val;
      }
    }
    return { category: maxKey, totalMinutes: maxVal };
  }, [timePoints]);

  // Chart layer toggles
  const [showCompletions, setShowCompletions] = useState(true);
  const [showTime, setShowTime] = useState(true);
  const [showDelays, setShowDelays] = useState(true);

  // Merge all three datasets into one array keyed by bucket
  const combinedData = useMemo(() => {
    const timeByKey = new Map(timePoints.map((p) => [p.bucketKey, p]));
    const delayByKey = new Map(delayPoints.map((p) => [p.date, p]));

    return chartPoints.map((cp) => {
      const tp = timeByKey.get(cp.date);
      const dp = delayByKey.get(cp.date);
      return {
        date: cp.date,
        dateLabel: cp.dateLabel,
        completions: cp.count,
        delays: dp?.count ?? 0,
        admin: tp?.admin ?? 0,
        operations: tp?.operations ?? 0,
        'business-dev': tp?.['business-dev'] ?? 0,
        'jardin-casa': tp?.['jardin-casa'] ?? 0,
        'jardin-finca': tp?.['jardin-finca'] ?? 0,
        personal: tp?.personal ?? 0,
        fitness: tp?.fitness ?? 0,
        timeTotal: tp?.total ?? 0,
      };
    });
  }, [chartPoints, timePoints, delayPoints]);

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
  if (combinedData.length > 60) tickInterval = 6;
  else if (combinedData.length > 14) tickInterval = 2;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <BackButton onClick={onBack} />
        <h1 className="text-lg font-semibold text-primary">Dashboard</h1>
      </div>

      {/* Preset buttons + granularity */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
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
        <div className="ml-auto flex items-center gap-1">
          {GRANULARITY_OPTIONS.map(({ key, label }) => {
            const isPermitted = permitted.includes(key);
            const isActive = granularity === key;
            let btnStyle =
              'bg-surface-alt text-muted opacity-40 cursor-not-allowed';
            if (isActive) btnStyle = 'bg-blue-500 text-white';
            else if (isPermitted)
              btnStyle = 'bg-surface-alt text-muted hover:text-primary';
            return (
              <button
                key={key}
                type="button"
                disabled={!isPermitted}
                onClick={() => setGranularity(key)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${btnStyle}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Avg Completions / Day"
          value={String(stats.avgPerDay)}
        />
        <StatCard
          label="Most Time Spent"
          value={
            topCategory.category ? CATEGORY_LABELS[topCategory.category] : '—'
          }
          subtitle={
            topCategory.category
              ? `${formatMinutes(Math.round(topCategory.totalMinutes / daysInRange))} / day`
              : undefined
          }
        />
        <StatCard
          label="Avg Delays / Day"
          value={String(Math.round((totalDelays / daysInRange) * 10) / 10)}
        />
      </div>

      {/* Chart layer toggles */}
      <div className="flex items-center gap-2 mb-3">
        <ChartToggle
          label="Completions"
          color="var(--color-accent)"
          active={showCompletions}
          onToggle={() => setShowCompletions((v) => !v)}
        />
        <ChartToggle
          label="Time by Category"
          color="#3b82f6"
          active={showTime}
          onToggle={() => setShowTime((v) => !v)}
        />
        <ChartToggle
          label="Delays"
          color="#f59e0b"
          active={showDelays}
          onToggle={() => setShowDelays((v) => !v)}
        />
      </div>

      {/* Combined chart */}
      <div className="h-[350px] mb-8">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={combinedData}
            margin={{ top: 5, right: showTime ? 10 : 20, bottom: 5, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
              interval={tickInterval}
            />
            <YAxis
              yAxisId="count"
              allowDecimals={false}
              tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
              width={30}
              hide={!showCompletions && !showDelays}
            />
            {showTime && (
              <YAxis
                yAxisId="time"
                orientation="right"
                tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
                width={40}
                tickFormatter={(value: number) =>
                  value >= 60 ? `${Math.round(value / 60)}h` : `${value}m`
                }
              />
            )}
            <Tooltip
              content={
                <CombinedTooltip
                  showCompletions={showCompletions}
                  showTime={showTime}
                  showDelays={showDelays}
                />
              }
            />
            {showTime &&
              TASK_TYPE_OPTIONS.map(({ value }) => (
                <Bar
                  key={value}
                  dataKey={value}
                  yAxisId="time"
                  stackId="time"
                  fill={CATEGORY_CHART_COLORS[value]}
                />
              ))}
            {showDelays && (
              <Line
                type="monotone"
                dataKey="delays"
                yAxisId="count"
                name="Delays"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={combinedData.length <= 31}
                activeDot={{ r: 4 }}
              />
            )}
            {showCompletions && (
              <Line
                type="monotone"
                dataKey="completions"
                yAxisId="count"
                name="Completed"
                stroke="var(--color-accent)"
                strokeWidth={2}
                dot={combinedData.length <= 31}
                activeDot={{ r: 4 }}
              />
            )}
          </ComposedChart>
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

const TIME_CATEGORY_KEYS = new Set<string>(
  TASK_TYPE_OPTIONS.map(({ value }) => value)
);

function CombinedTooltip({
  active,
  payload,
  label,
  showCompletions,
  showTime,
  showDelays,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number; fill: string; stroke?: string }[];
  label?: string;
  showCompletions: boolean;
  showTime: boolean;
  showDelays: boolean;
}) {
  if (!active || !payload) return null;

  const completionsEntry = showCompletions
    ? payload.find((p) => p.dataKey === 'completions')
    : undefined;
  const delaysEntry = showDelays
    ? payload.find((p) => p.dataKey === 'delays')
    : undefined;
  const timeEntries = showTime
    ? payload.filter((p) => TIME_CATEGORY_KEYS.has(p.dataKey) && p.value > 0)
    : [];
  const timeTotal = timeEntries.reduce((sum, p) => sum + p.value, 0);

  const hasContent =
    (completionsEntry && completionsEntry.value > 0) ||
    (delaysEntry && delaysEntry.value > 0) ||
    timeEntries.length > 0;
  if (!hasContent) return null;

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
      {completionsEntry && completionsEntry.value > 0 && (
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{
              backgroundColor: completionsEntry.stroke || completionsEntry.fill,
            }}
          />
          <span>Completed</span>
          <span className="ml-auto font-medium">{completionsEntry.value}</span>
        </div>
      )}
      {delaysEntry && delaysEntry.value > 0 && (
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: delaysEntry.fill }}
          />
          <span>Delays</span>
          <span className="ml-auto font-medium">{delaysEntry.value}</span>
        </div>
      )}
      {timeEntries.length > 0 && (
        <>
          {completionsEntry?.value || delaysEntry?.value ? (
            <div
              className="border-t my-1"
              style={{ borderColor: 'var(--color-border)' }}
            />
          ) : null}
          {timeEntries.map((entry) => (
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
          {timeEntries.length > 1 && (
            <div
              className="flex items-center gap-2 border-t mt-1 pt-1"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <span className="font-medium">Total time</span>
              <span className="ml-auto font-medium">
                {formatMinutes(timeTotal)}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ChartToggle({
  label,
  color,
  active,
  onToggle,
}: {
  label: string;
  color: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors ${
        active
          ? 'bg-surface-alt text-primary'
          : 'bg-surface-alt text-muted opacity-50'
      }`}
    >
      <span
        className="inline-block w-2.5 h-2.5 rounded-sm"
        style={{ backgroundColor: active ? color : 'var(--color-muted)' }}
      />
      {label}
    </button>
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
