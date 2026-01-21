import { useState, useEffect, useCallback } from 'react';
import type { CalendarEvent } from '../types';
import { useGoogleAuth } from '../context/GoogleAuthContext';

const API_URL = import.meta.env.VITE_API_URL || '';
const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes
const IS_TEST = import.meta.env.MODE === 'test';

function formatDateForAPI(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function getTimezoneOffset(): string {
  const offset = new Date().getTimezoneOffset();
  const sign = offset <= 0 ? '+' : '-';
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
  const minutes = String(Math.abs(offset) % 60).padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
}

export function useCalendarEvents(date: Date = new Date()) {
  const { isConnected } = useGoogleAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Use date string as stable dependency to avoid infinite loops
  const dateStr = formatDateForAPI(date);

  const fetchEvents = useCallback(async () => {
    if (!isConnected) {
      setEvents([]);
      return;
    }

    setIsLoading(true);
    setError(undefined);

    try {
      const response = await fetch(
        `${API_URL}/api/calendar/events?date=${dateStr}&timezone=${encodeURIComponent(getTimezone())}&offset=${encodeURIComponent(getTimezoneOffset())}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch calendar events');
      }

      const data = await response.json();
      setEvents(data.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, dateStr]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Poll every 5 minutes (disabled in test environment)
  useEffect(() => {
    if (!isConnected || IS_TEST) return;

    const intervalId = setInterval(fetchEvents, POLL_INTERVAL);
    return () => clearInterval(intervalId);
  }, [isConnected, fetchEvents]);

  return {
    events,
    isLoading,
    error,
    refresh: fetchEvents,
  };
}
