import {
  parseISO,
  addMinutes,
  eachDayOfInterval,
  isWeekend,
  setHours,
  setMinutes,
  isBefore,
  isAfter,
  addWeeks,
  format,
} from 'date-fns'
import { BusyInterval, RequestParticipant, SchedulingRequest, SuggestedSlot } from '@/types'
import { generateId } from '@/lib/utils'

interface ParticipantIntervals {
  participantId: string
  name: string
  intervals: BusyInterval[]
}

/**
 * Core overlap engine.
 * Computes top 3–5 suggested meeting slots given participant busy intervals.
 */
export function computeSuggestedSlots(
  request: SchedulingRequest,
  participantData: ParticipantIntervals[],
  _existingSlotId?: string
): SuggestedSlot[] {
  const windowStart = parseISO(request.window_start)
  const windowEnd = parseISO(request.window_end)
  const duration = request.duration_minutes
  const [startH, startM] = request.meeting_hours_start.split(':').map(Number)
  const [endH, endM] = request.meeting_hours_end.split(':').map(Number)
  const k = request.conflict_threshold_k

  const candidates: SuggestedSlot[] = []

  const days = eachDayOfInterval({ start: windowStart, end: windowEnd })

  for (const day of days) {
    if (isWeekend(day)) continue

    // Generate 15-min slots within meeting hours
    let slotStart = setMinutes(setHours(day, startH), startM)
    const dayEnd = setMinutes(setHours(day, endH), endM)

    while (isBefore(addMinutes(slotStart, duration), dayEnd) ||
           addMinutes(slotStart, duration).getTime() === dayEnd.getTime()) {
      const slotEnd = addMinutes(slotStart, duration)

      // Count conflicts
      const conflictedIds: string[] = []
      for (const pd of participantData) {
        if (hasConflict(slotStart, slotEnd, pd.intervals)) {
          conflictedIds.push(pd.participantId)
        }
      }

      const conflictCount = conflictedIds.length
      const isNearMiss = conflictCount > 0 && conflictCount <= k
      const isPerfect = conflictCount === 0

      if (isPerfect || isNearMiss) {
        const score = computeScore(slotStart, conflictCount, startH, endH)
        candidates.push({
          id: generateId(),
          request_id: request.id,
          start_time: slotStart.toISOString(),
          end_time: slotEnd.toISOString(),
          conflict_count: conflictCount,
          conflicted_participant_ids: conflictedIds,
          conflicted_names: conflictedIds.map(
            (id) => participantData.find((p) => p.participantId === id)?.name || 'Unknown'
          ),
          score,
          is_near_miss: isNearMiss,
          rank: 0,
          created_at: new Date().toISOString(),
        })
      }

      slotStart = addMinutes(slotStart, 15)
    }
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score)

  // Remove duplicates / overlapping slots (keep best per hour block)
  const deduplicated = deduplicateSlots(candidates, duration)

  // Assign ranks, return top 5
  return deduplicated.slice(0, 5).map((s, i) => ({ ...s, rank: i + 1 }))
}

/**
 * For recurring requests: evaluate how a given weekly time slot
 * performs across N weeks.
 */
export function computeRecurringViability(
  slot: SuggestedSlot,
  request: SchedulingRequest,
  participantData: ParticipantIntervals[]
): { viability: Record<string, boolean>; label: string; goodWeeks: number } {
  const n = request.recurrence_weeks || 4
  const slotStart = parseISO(slot.start_time)
  const viability: Record<string, boolean> = {}
  let goodWeeks = 0

  for (let i = 0; i < n; i++) {
    const weekStart = addWeeks(slotStart, i)
    const weekEnd = addMinutes(weekStart, request.duration_minutes)

    let weekConflicts = 0
    for (const pd of participantData) {
      if (hasConflict(weekStart, weekEnd, pd.intervals)) weekConflicts++
    }

    const ok = weekConflicts <= request.conflict_threshold_k
    viability[`week_${i + 1}`] = ok
    if (ok) goodWeeks++
  }

  const label =
    goodWeeks === n
      ? `Works all ${n} weeks`
      : `Works ${goodWeeks} of ${n} weeks`

  return { viability, label, goodWeeks }
}

function hasConflict(slotStart: Date, slotEnd: Date, intervals: BusyInterval[]): boolean {
  for (const interval of intervals) {
    const busyStart = parseISO(interval.start_time)
    const busyEnd = parseISO(interval.end_time)
    // Overlap if slotStart < busyEnd AND slotEnd > busyStart
    if (isBefore(slotStart, busyEnd) && isAfter(slotEnd, busyStart)) {
      return true
    }
  }
  return false
}

function computeScore(slotStart: Date, conflictCount: number, dayStartH: number, dayEndH: number): number {
  let score = 100

  // Penalize conflicts heavily
  score -= conflictCount * 30

  // Prefer 10am–4pm window (peak productivity)
  const hour = slotStart.getHours()
  if (hour >= 10 && hour <= 15) {
    score += 10
  } else if (hour < 9 || hour > 17) {
    score -= 20
  }

  // Prefer earlier in the day (within meeting window)
  const dayHours = dayEndH - dayStartH
  const relativePosition = (hour - dayStartH) / dayHours
  score -= relativePosition * 5

  // Prefer earlier in date window (small bonus for earlier dates)
  const dayOfWeek = slotStart.getDay()
  if (dayOfWeek === 1) score += 2 // Monday slight boost
  if (dayOfWeek === 5) score -= 2 // Friday slight penalty

  return score
}

function deduplicateSlots(slots: SuggestedSlot[], _duration: number): SuggestedSlot[] {
  const result: SuggestedSlot[] = []
  const usedBlocks = new Set<string>()

  for (const slot of slots) {
    const start = parseISO(slot.start_time)
    // Key by hour block to avoid returning 3:00, 3:15, 3:30 as separate top results
    const blockKey = format(start, 'yyyy-MM-dd-HH')

    if (!usedBlocks.has(blockKey)) {
      usedBlocks.add(blockKey)
      result.push(slot)
    }
  }

  return result
}

export function buildParticipantIntervals(
  participants: RequestParticipant[],
  allBusyIntervals: BusyInterval[]
): ParticipantIntervals[] {
  return participants
    .filter((p) => p.user_id)
    .map((p) => ({
      participantId: p.user_id!,
      name: p.name || p.email,
      intervals: allBusyIntervals.filter((b) => b.user_id === p.user_id),
    }))
}
