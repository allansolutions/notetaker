import type {
  CalendarEvent,
  GoogleCalendarEvent,
  GoogleCalendarResponse,
  GoogleTokens,
} from '../types';

const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

export function buildOAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope:
      'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `${GOOGLE_OAUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<GoogleTokens> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<GoogleTokens> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return response.json();
}

export interface GoogleUserProfile {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

export async function getUserProfile(
  accessToken: string
): Promise<GoogleUserProfile> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user info');
  }

  return (await response.json()) as GoogleUserProfile;
}

export async function fetchCalendarEvents(
  accessToken: string,
  date: string,
  timezone: string = 'UTC',
  offset: string = '+00:00'
): Promise<GoogleCalendarEvent[]> {
  // Construct RFC3339 timestamps with the user's timezone offset
  // This ensures we query for events on the correct day in their timezone
  const timeMin = `${date}T00:00:00${offset}`;
  const timeMax = `${date}T23:59:59${offset}`;

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    timeZone: timezone,
    singleEvents: 'true',
    orderBy: 'startTime',
  });

  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/primary/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch calendar events: ${error}`);
  }

  const data = (await response.json()) as GoogleCalendarResponse;
  return data.items || [];
}

export function isDeclinedByUser(event: GoogleCalendarEvent): boolean {
  const selfAttendee = event.attendees?.find((a) => a.self === true);
  return selfAttendee?.responseStatus === 'declined';
}

export function transformGoogleEvent(
  event: GoogleCalendarEvent
): CalendarEvent {
  const isAllDay = !event.start.dateTime;

  if (isAllDay) {
    return {
      id: event.id,
      summary: event.summary || '(No title)',
      description: event.description,
      startTime: 0,
      duration: 24 * 60,
      isAllDay: true,
      htmlLink: event.htmlLink,
    };
  }

  const startDate = new Date(event.start.dateTime!);
  const endDate = new Date(event.end.dateTime!);

  return {
    id: event.id,
    summary: event.summary || '(No title)',
    description: event.description,
    startTime: startDate.getHours() * 60 + startDate.getMinutes(),
    duration: Math.round((endDate.getTime() - startDate.getTime()) / 60000),
    isAllDay: false,
    htmlLink: event.htmlLink,
  };
}

export async function revokeToken(token: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
}
