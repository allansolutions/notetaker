import type { Database } from './db';

export interface Env {
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  FRONTEND_URL: string;
}

export interface Variables {
  db: Database;
  sessionId?: string;
  userId?: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  startTime: number;
  duration: number;
  isAllDay: boolean;
  htmlLink?: string;
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export interface GoogleCalendarAttendee {
  email: string;
  displayName?: string;
  self?: boolean;
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
}

export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  htmlLink?: string;
  attendees?: GoogleCalendarAttendee[];
}

export interface GoogleCalendarResponse {
  items: GoogleCalendarEvent[];
  nextPageToken?: string;
}
