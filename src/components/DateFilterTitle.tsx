import { DateFilterPreset, DateRange } from '../types';
import { getRelativeDateLabel, getWeekStart } from '../utils/date-filters';

interface DateFilterTitleProps {
  preset: DateFilterPreset;
  specificDate?: number | null;
  dateRange?: DateRange | null;
}

const RELATIVE_LABELS: Record<string, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  tomorrow: 'Tomorrow',
};

function formatDateLong(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateRange(start: number, end: number): string {
  return `${formatDateLong(start)} – ${formatDateLong(end)}`;
}

function formatWithRelativePrefix(timestamp: number): string {
  const relativeLabel = getRelativeDateLabel(timestamp);
  const formattedDate = formatDateLong(timestamp);
  if (!relativeLabel) return formattedDate;
  return `${RELATIVE_LABELS[relativeLabel]} – ${formattedDate}`;
}

function getDateFilterText(
  preset: DateFilterPreset,
  specificDate?: number | null,
  dateRange?: DateRange | null
): string | null {
  const now = new Date();

  switch (preset) {
    case 'all':
      return null;

    case 'today':
      return formatDateLong(now.getTime());

    case 'tomorrow': {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return formatDateLong(tomorrow.getTime());
    }

    case 'this-week': {
      const monday = getWeekStart(now);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return formatDateRange(monday.getTime(), sunday.getTime());
    }

    case 'specific-date':
      return specificDate ? formatWithRelativePrefix(specificDate) : null;

    case 'date-range':
      return dateRange ? formatDateRange(dateRange.start, dateRange.end) : null;

    default:
      return null;
  }
}

export function DateFilterTitle({
  preset,
  specificDate,
  dateRange,
}: DateFilterTitleProps) {
  const text = getDateFilterText(preset, specificDate, dateRange);

  if (!text) {
    return null;
  }

  return (
    <div className="text-center py-4 mb-4">
      <h2 className="text-lg font-semibold text-primary">{text}</h2>
    </div>
  );
}
