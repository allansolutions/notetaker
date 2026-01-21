import { DateFilterPreset, DateRange } from '../types';

interface DateFilterTitleProps {
  preset: DateFilterPreset;
  specificDate?: number | null;
  dateRange?: DateRange | null;
}

/**
 * Formats a date as "Wednesday 21 January 2025"
 */
function formatDateLong(timestamp: number): string {
  const date = new Date(timestamp);
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' });
  const day = date.getDate();
  const month = date.toLocaleDateString('en-GB', { month: 'long' });
  const year = date.getFullYear();
  return `${weekday} ${day} ${month} ${year}`;
}

/**
 * Gets the display text for a date filter
 */
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
      // Get Monday of current week
      const monday = new Date(now);
      const dayOfWeek = monday.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      monday.setDate(monday.getDate() - daysFromMonday);

      // Get Sunday of current week
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      return `${formatDateLong(monday.getTime())} – ${formatDateLong(sunday.getTime())}`;
    }

    case 'specific-date':
      if (specificDate) {
        return formatDateLong(specificDate);
      }
      return null;

    case 'date-range':
      if (dateRange) {
        return `${formatDateLong(dateRange.start)} – ${formatDateLong(dateRange.end)}`;
      }
      return null;

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
