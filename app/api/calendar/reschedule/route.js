import { getServerSession } from "next-auth/next";
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, delayMinutes } = await request.json();

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const event = await calendar.events.get({
      calendarId: 'primary',
      eventId: eventId,
    });

    const oldStart = new Date(event.data.start.dateTime || event.data.start.date);
    const oldEnd = new Date(event.data.end.dateTime || event.data.end.date);
    const delayMs = delayMinutes * 60 * 1000;

    const newStart = new Date(oldStart.getTime() + delayMs);
    const newEnd = new Date(oldEnd.getTime() + delayMs);

    const updatedEvent = await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: {
        ...event.data,
        start: {
          dateTime: newStart.toISOString(),
          timeZone: event.data.start.timeZone || 'UTC',
        },
        end: {
          dateTime: newEnd.toISOString(),
          timeZone: event.data.end.timeZone || 'UTC',
        },
      },
    });

    return NextResponse.json({ success: true, event: updatedEvent.data });
  } catch (error) {
    console.error('Reschedule error:', error);
    return NextResponse.json({ error: 'Failed to reschedule event' }, { status: 500 });
  }
}
