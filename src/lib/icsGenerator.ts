import { parseISO, format } from 'date-fns'
import { MeetingEvent, RequestParticipant } from '@/types'

function formatICSDate(isoString: string): string {
  const date = parseISO(isoString)
  return format(date, "yyyyMMdd'T'HHmmss'Z'")
}

function escapeICS(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export function generateICSContent(event: MeetingEvent, participants: RequestParticipant[]): string {
  const now = formatICSDate(new Date().toISOString())
  const uid = `${event.id}@schedsync.app`

  const attendeeLines = participants
    .map((p) => `ATTENDEE;RSVP=TRUE;CN=${escapeICS(p.name || p.email)}:mailto:${p.email}`)
    .join('\r\n')

  const rruleLine = event.recurrence_rule ? `\r\nRRULE:${event.recurrence_rule}` : ''

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SchedSync//SchedSync MVP//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatICSDate(event.start_time)}`,
    `DTEND:${formatICSDate(event.end_time)}`,
    `SUMMARY:${escapeICS(event.title)}`,
    event.description ? `DESCRIPTION:${escapeICS(event.description)}` : '',
    attendeeLines,
    `ORGANIZER:mailto:organizer@schedsync.app`,
    `STATUS:CONFIRMED`,
    `TRANSP:OPAQUE`,
    rruleLine,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n')
}

export function downloadICS(event: MeetingEvent, participants: RequestParticipant[]): void {
  const content = generateICSContent(event, participants)
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${event.title.replace(/\s+/g, '_')}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function generateInviteText(event: MeetingEvent, participants: RequestParticipant[]): string {
  const start = parseISO(event.start_time)
  const end = parseISO(event.end_time)
  const dateStr = format(start, 'EEEE, MMMM d, yyyy')
  const timeStr = `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`
  const attendees = participants.map((p) => p.name || p.email).join(', ')

  return `You're invited to: ${event.title}
Date: ${dateStr}
Time: ${timeStr} (${event.timezone})
${event.recurrence_rule ? 'Recurring: Weekly\n' : ''}Attendees: ${attendees}
${event.description ? `\nNotes: ${event.description}` : ''}

Scheduled with SchedSync`
}
