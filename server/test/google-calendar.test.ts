import { describe, it, expect } from 'vitest';
import {
  buildOAuthUrl,
  transformGoogleEvent,
} from '../src/services/google-calendar';
import type { GoogleCalendarEvent } from '../src/types';

describe('buildOAuthUrl', () => {
  it('builds OAuth URL with correct parameters', () => {
    const url = buildOAuthUrl(
      'test-client-id',
      'http://localhost:8787/auth/callback',
      'test-state'
    );

    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url).toContain('client_id=test-client-id');
    expect(url).toContain(
      'redirect_uri=http%3A%2F%2Flocalhost%3A8787%2Fauth%2Fcallback'
    );
    expect(url).toContain('state=test-state');
    expect(url).toContain('response_type=code');
    expect(url).toContain('access_type=offline');
    expect(url).toContain('prompt=consent');
  });

  it('includes calendar.readonly scope', () => {
    const url = buildOAuthUrl('client', 'http://example.com', 'state');
    expect(url).toContain('calendar.readonly');
  });

  it('includes userinfo.email scope', () => {
    const url = buildOAuthUrl('client', 'http://example.com', 'state');
    expect(url).toContain('userinfo.email');
  });
});

describe('transformGoogleEvent', () => {
  it('transforms timed event correctly', () => {
    const googleEvent: GoogleCalendarEvent = {
      id: 'event-1',
      summary: 'Team Meeting',
      description: 'Weekly sync',
      start: { dateTime: '2024-01-15T10:30:00-05:00' },
      end: { dateTime: '2024-01-15T11:30:00-05:00' },
      htmlLink: 'https://calendar.google.com/event/1',
    };

    const result = transformGoogleEvent(googleEvent);

    expect(result.id).toBe('event-1');
    expect(result.summary).toBe('Team Meeting');
    expect(result.description).toBe('Weekly sync');
    expect(result.startTime).toBe(10 * 60 + 30); // 10:30 = 630 minutes
    expect(result.duration).toBe(60); // 1 hour
    expect(result.isAllDay).toBe(false);
    expect(result.htmlLink).toBe('https://calendar.google.com/event/1');
  });

  it('transforms all-day event correctly', () => {
    const googleEvent: GoogleCalendarEvent = {
      id: 'event-2',
      summary: 'Company Holiday',
      start: { date: '2024-01-15' },
      end: { date: '2024-01-16' },
    };

    const result = transformGoogleEvent(googleEvent);

    expect(result.id).toBe('event-2');
    expect(result.summary).toBe('Company Holiday');
    expect(result.startTime).toBe(0);
    expect(result.duration).toBe(24 * 60); // Full day
    expect(result.isAllDay).toBe(true);
  });

  it('handles missing summary', () => {
    const googleEvent: GoogleCalendarEvent = {
      id: 'event-3',
      start: { dateTime: '2024-01-15T09:00:00Z' },
      end: { dateTime: '2024-01-15T10:00:00Z' },
    };

    const result = transformGoogleEvent(googleEvent);

    expect(result.summary).toBe('(No title)');
  });

  it('handles missing description', () => {
    const googleEvent: GoogleCalendarEvent = {
      id: 'event-4',
      summary: 'Meeting',
      start: { dateTime: '2024-01-15T09:00:00Z' },
      end: { dateTime: '2024-01-15T10:00:00Z' },
    };

    const result = transformGoogleEvent(googleEvent);

    expect(result.description).toBeUndefined();
  });

  it('calculates duration for multi-hour event', () => {
    const googleEvent: GoogleCalendarEvent = {
      id: 'event-5',
      summary: 'Workshop',
      start: { dateTime: '2024-01-15T13:00:00Z' },
      end: { dateTime: '2024-01-15T17:00:00Z' },
    };

    const result = transformGoogleEvent(googleEvent);

    expect(result.duration).toBe(4 * 60); // 4 hours = 240 minutes
  });

  it('handles short events', () => {
    const googleEvent: GoogleCalendarEvent = {
      id: 'event-6',
      summary: 'Quick Call',
      start: { dateTime: '2024-01-15T14:00:00Z' },
      end: { dateTime: '2024-01-15T14:15:00Z' },
    };

    const result = transformGoogleEvent(googleEvent);

    expect(result.duration).toBe(15);
  });
});
