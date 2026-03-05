import { addDays, addMinutes, startOfDay, parseISO, isWeekend, setHours, setMinutes } from 'date-fns'
import { BusyInterval } from '@/types'
import { generateId, seededRandom } from '@/lib/utils'

const EVENT_NAMES_BY_PROVIDER: Record<string, string[]> = {
  outlook: [
    'Introduction to Product Management',
    'Power and Negotiation',
    'Engine Lab',
    'Generative AI Lab',
    'Organizational Behavior',
    'Corporate Finance',
    'Design Thinking',
    'Data Analytics',
    'Leadership & Teams',
    'Marketing Strategy',
  ],
  google: [
    'Coffee chat with Alex',
    'Coffee chat with Priya',
    'Coffee chat with Jordan',
    'Coffee chat with Sam',
    'Coffee chat with Maya',
    'Networking call',
    'Networking call with LinkedIn contact',
    'Informational interview',
    'Alumni catch-up',
    'Recruiter screen',
  ],
  apple: [
    'Morning run',
    'Gym session',
    'Yoga class',
    'Rock climbing',
    'Basketball pickup',
    'Pilates',
    'Hiking',
    'Swimming',
    'Cycling',
    'Meditation',
  ],
  other: [
    'Team standup', 'Sprint planning', 'Design sync', '1:1 with manager',
    'Focus time', 'Code review', 'Demo prep', 'Weekly wrap-up',
    'Customer call', 'Board prep',
  ],
}

export function getMockEventName(startTime: string, provider?: string): string {
  // Use a polynomial hash (djb2-style) so strings differing by one char get very different hashes
  const key = (provider || 'other') + startTime
  let h = 5381
  for (let i = 0; i < key.length; i++) {
    h = (Math.imul(31, h) + key.charCodeAt(i)) | 0
  }
  const names = EVENT_NAMES_BY_PROVIDER[provider || 'other'] ?? EVENT_NAMES_BY_PROVIDER.other
  return names[Math.abs(h) % names.length]
}

/**
 * Generates realistic mock busy intervals for a user.
 * Uses the userId as a seed so each user gets a unique but consistent schedule.
 */
export function generateMockBusyIntervals(
  userId: string,
  windowStart: string,
  windowEnd: string,
  connectionId?: string
): BusyInterval[] {
  const seedStr = userId + (connectionId || '')
  const seed = seedStr.split('').reduce((acc, c, i) => (acc + c.charCodeAt(0) * (i + 1)) | 0, 0)
  const rand = seededRandom(Math.abs(seed))

  const start = parseISO(windowStart)
  const end = parseISO(windowEnd)
  const intervals: BusyInterval[] = []

  let current = startOfDay(start)
  while (current <= end) {
    if (!isWeekend(current)) {
      const dayOfWeek = current.getDay() // 1=Mon ... 5=Fri

      // Morning block (9am-12pm): busier Mon/Wed/Fri
      const morningBusy = dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5
        ? rand() < 0.75
        : rand() < 0.45

      if (morningBusy) {
        const startHour = 9 + Math.floor(rand() * 2)
        const blockDuration = 30 + Math.floor(rand() * 4) * 30 // 30, 60, 90, 120 min
        const blockStart = setMinutes(setHours(current, startHour), rand() < 0.5 ? 0 : 30)
        const blockEnd = addMinutes(blockStart, blockDuration)
        intervals.push(makeBusyInterval(userId, blockStart, blockEnd, connectionId))
      }

      // Mid-morning block (10am-11:30am): occasional
      if (rand() < 0.35) {
        const blockStart = setMinutes(setHours(current, 10), rand() < 0.5 ? 0 : 30)
        const blockEnd = addMinutes(blockStart, 60)
        intervals.push(makeBusyInterval(userId, blockStart, blockEnd, connectionId))
      }

      // Lunch block (12pm-1pm): most days
      if (rand() < 0.6) {
        const blockStart = setHours(current, 12)
        const blockEnd = setHours(current, 13)
        intervals.push(makeBusyInterval(userId, blockStart, blockEnd, connectionId))
      }

      // Afternoon block (1pm-5pm): busier Tue/Thu
      const afternoonBusy = dayOfWeek === 2 || dayOfWeek === 4
        ? rand() < 0.7
        : rand() < 0.4

      if (afternoonBusy) {
        const startHour = 13 + Math.floor(rand() * 3)
        const blockDuration = 60 + Math.floor(rand() * 3) * 30
        const blockStart = setMinutes(setHours(current, startHour), rand() < 0.5 ? 0 : 30)
        const blockEnd = addMinutes(blockStart, blockDuration)
        intervals.push(makeBusyInterval(userId, blockStart, blockEnd, connectionId))
      }

      // Late afternoon (4pm-6pm): occasional
      if (rand() < 0.3) {
        const blockStart = setMinutes(setHours(current, 16), rand() < 0.5 ? 0 : 30)
        const blockEnd = addMinutes(blockStart, 60)
        intervals.push(makeBusyInterval(userId, blockStart, blockEnd, connectionId))
      }

      // Random extra block (recruiting/interview prep)
      if (rand() < 0.25) {
        const startHour = 9 + Math.floor(rand() * 8)
        const blockStart = setHours(current, startHour)
        const blockEnd = addMinutes(blockStart, 60)
        intervals.push(makeBusyInterval(userId, blockStart, blockEnd, connectionId))
      }
    }
    current = addDays(current, 1)
  }

  return intervals
}

function makeBusyInterval(userId: string, start: Date, end: Date, connectionId?: string): BusyInterval {
  return {
    id: generateId(),
    user_id: userId,
    calendar_connection_id: connectionId,
    source: 'mock',
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    generated_at: new Date().toISOString(),
  }
}

/**
 * Parses a .ics file and extracts busy intervals (VEVENT start/end only).
 */
export function parseICSFile(content: string, userId: string): BusyInterval[] {
  const intervals: BusyInterval[] = []
  const eventBlocks = content.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || []

  for (const block of eventBlocks) {
    const dtstart = extractICSValue(block, 'DTSTART')
    const dtend = extractICSValue(block, 'DTEND')

    if (dtstart && dtend) {
      try {
        const start = parseICSDate(dtstart)
        const end = parseICSDate(dtend)
        if (start && end) {
          intervals.push({
            id: generateId(),
            user_id: userId,
            source: 'ics_upload',
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            generated_at: new Date().toISOString(),
          })
        }
      } catch {
        // skip malformed events
      }
    }
  }

  return intervals
}

function extractICSValue(block: string, key: string): string | null {
  const match = block.match(new RegExp(`${key}(?:;[^:]*)?:([^\r\n]+)`))
  return match ? match[1].trim() : null
}

function parseICSDate(value: string): Date | null {
  // Format: 20240315T090000Z or 20240315T090000 or 20240315
  const _clean = value.replace(/[TZ]/g, ' ').trim()
  const date = new Date(
    value.length >= 15
      ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}Z`
      : `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
  )
  return isNaN(date.getTime()) ? null : date
}
