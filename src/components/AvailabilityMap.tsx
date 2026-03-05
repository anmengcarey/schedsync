import { useMemo } from 'react'
import { eachDayOfInterval, parseISO, format, setHours, setMinutes, addMinutes, isWeekend } from 'date-fns'
import { BusyInterval, RequestParticipant, SuggestedSlot } from '@/types'
import { cn } from '@/lib/utils'

interface AvailabilityMapProps {
  windowStart: string
  windowEnd: string
  meetingHoursStart: string
  meetingHoursEnd: string
  participants: RequestParticipant[]
  busyIntervals: BusyInterval[]
  suggestedSlots?: SuggestedSlot[]
  durationMinutes?: number
}

const SLOT_HEIGHT = 20 // px per 30-min block

export function AvailabilityMap({
  windowStart,
  windowEnd,
  meetingHoursStart,
  meetingHoursEnd,
  participants,
  busyIntervals,
  suggestedSlots = [],
  durationMinutes = 60,
}: AvailabilityMapProps) {
  const days = useMemo(() => {
    const all = eachDayOfInterval({ start: parseISO(windowStart), end: parseISO(windowEnd) })
    return all.filter((d) => !isWeekend(d)).slice(0, 7)
  }, [windowStart, windowEnd])

  const [startH, startM] = meetingHoursStart.split(':').map(Number)
  const [endH, endM] = meetingHoursEnd.split(':').map(Number)

  const timeSlots = useMemo(() => {
    const slots: Date[] = []
    let current = setMinutes(setHours(new Date(0), startH), startM)
    const end = setMinutes(setHours(new Date(0), endH), endM)
    while (current < end) {
      slots.push(new Date(current))
      current = addMinutes(current, 30)
    }
    return slots
  }, [startH, startM, endH, endM])

  function getConflictCount(day: Date, slotTime: Date): number {
    const slotStart = new Date(day)
    slotStart.setHours(slotTime.getHours(), slotTime.getMinutes(), 0, 0)
    const slotEnd = addMinutes(slotStart, 30)

    let count = 0
    for (const p of participants) {
      if (!p.user_id) continue
      const userIntervals = busyIntervals.filter((b) => b.user_id === p.user_id)
      for (const interval of userIntervals) {
        const bStart = parseISO(interval.start_time)
        const bEnd = parseISO(interval.end_time)
        if (slotStart < bEnd && slotEnd > bStart) {
          count++
          break
        }
      }
    }
    return count
  }

  function isSuggestedSlot(day: Date, slotTime: Date): SuggestedSlot | undefined {
    const slotStart = new Date(day)
    slotStart.setHours(slotTime.getHours(), slotTime.getMinutes(), 0, 0)

    return suggestedSlots.find((s) => {
      const sStart = parseISO(s.start_time)
      return (
        format(sStart, 'yyyy-MM-dd') === format(slotStart, 'yyyy-MM-dd') &&
        sStart.getHours() === slotStart.getHours() &&
        sStart.getMinutes() === slotStart.getMinutes()
      )
    })
  }

  const total = participants.filter((p) => p.user_id).length

  function getCellColor(conflicts: number, isSuggested: boolean): string {
    if (isSuggested) return 'bg-teal-400 ring-2 ring-teal-600'
    if (total === 0) return 'bg-gray-100'
    const ratio = conflicts / total
    if (ratio === 0) return 'bg-green-200'
    if (ratio <= 0.25) return 'bg-green-100'
    if (ratio <= 0.5) return 'bg-yellow-200'
    if (ratio <= 0.75) return 'bg-orange-200'
    return 'bg-red-200'
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[500px]">
        {/* Header: days */}
        <div className="flex ml-12">
          {days.map((day) => (
            <div key={day.toISOString()} className="flex-1 text-center pb-2">
              <p className="text-xs font-medium text-gray-500">{format(day, 'EEE')}</p>
              <p className="text-sm font-semibold text-gray-800">{format(day, 'MMM d')}</p>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex">
          {/* Time labels */}
          <div className="w-12 flex-shrink-0">
            {timeSlots.map((slot, i) => (
              <div
                key={i}
                style={{ height: SLOT_HEIGHT }}
                className="flex items-center justify-end pr-2"
              >
                {slot.getMinutes() === 0 && (
                  <span className="text-xs text-gray-400">{format(slot, 'ha').toLowerCase()}</span>
                )}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => (
            <div key={day.toISOString()} className="flex-1 border-l border-gray-100">
              {timeSlots.map((slotTime, i) => {
                const conflicts = getConflictCount(day, slotTime)
                const suggested = isSuggestedSlot(day, slotTime)
                return (
                  <div
                    key={i}
                    style={{ height: SLOT_HEIGHT }}
                    className={cn(
                      'border-b border-gray-50 transition-colors cursor-default',
                      getCellColor(conflicts, !!suggested)
                    )}
                    title={
                      suggested
                        ? `Suggested #${suggested.rank} — ${conflicts} conflict(s)`
                        : conflicts > 0
                        ? `${conflicts} of ${total} busy`
                        : 'Everyone free'
                    }
                  />
                )
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 flex-wrap">
          <span className="text-xs text-gray-500">Availability:</span>
          {[
            { color: 'bg-green-200', label: 'All free' },
            { color: 'bg-yellow-200', label: 'Some conflict' },
            { color: 'bg-red-200', label: 'Most busy' },
            { color: 'bg-teal-400', label: 'Suggested slot' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded-sm ${color}`} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
