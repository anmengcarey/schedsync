import { useState, useCallback } from 'react'
import { eachDayOfInterval, parseISO, format, setHours, setMinutes, addMinutes, isWeekend } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface ManualAvailabilityGridProps {
  windowStart: string
  windowEnd: string
  meetingHoursStart: string
  meetingHoursEnd: string
  onSubmit: (freeIntervals: Array<{ start: string; end: string }>) => void
  loading?: boolean
}

type CellState = 'busy' | 'free'

export function ManualAvailabilityGrid({
  windowStart,
  windowEnd,
  meetingHoursStart,
  meetingHoursEnd,
  onSubmit,
  loading,
}: ManualAvailabilityGridProps) {
  const days = eachDayOfInterval({ start: parseISO(windowStart), end: parseISO(windowEnd) })
    .filter((d) => !isWeekend(d))
    .slice(0, 7)

  const [startH, startM] = meetingHoursStart.split(':').map(Number)
  const [endH, endM] = meetingHoursEnd.split(':').map(Number)

  const timeSlots: Date[] = []
  let cur = setMinutes(setHours(new Date(0), startH), startM)
  const endTime = setMinutes(setHours(new Date(0), endH), endM)
  while (cur < endTime) {
    timeSlots.push(new Date(cur))
    cur = addMinutes(cur, 30)
  }

  // State: dayIndex × slotIndex → 'busy' | 'free'
  const [grid, setGrid] = useState<CellState[][]>(() =>
    days.map(() => timeSlots.map(() => 'busy'))
  )

  const [isDragging, setIsDragging] = useState(false)
  const [dragState, setDragState] = useState<CellState>('free')

  const handleMouseDown = useCallback((dayIdx: number, slotIdx: number) => {
    const current = grid[dayIdx][slotIdx]
    const newState: CellState = current === 'busy' ? 'free' : 'busy'
    setDragState(newState)
    setIsDragging(true)
    setGrid((prev) => {
      const next = prev.map((row) => [...row])
      next[dayIdx][slotIdx] = newState
      return next
    })
  }, [grid])

  const handleMouseEnter = useCallback((dayIdx: number, slotIdx: number) => {
    if (!isDragging) return
    setGrid((prev) => {
      const next = prev.map((row) => [...row])
      next[dayIdx][slotIdx] = dragState
      return next
    })
  }, [isDragging, dragState])

  const handleMouseUp = useCallback(() => setIsDragging(false), [])

  function handleSubmit() {
    const freeIntervals: Array<{ start: string; end: string }> = []
    days.forEach((day, dayIdx) => {
      timeSlots.forEach((slot, slotIdx) => {
        if (grid[dayIdx][slotIdx] === 'free') {
          const slotStart = new Date(day)
          slotStart.setHours(slot.getHours(), slot.getMinutes(), 0, 0)
          const slotEnd = addMinutes(slotStart, 30)
          freeIntervals.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() })
        }
      })
    })
    onSubmit(freeIntervals)
  }

  function handleMarkAllFree() {
    setGrid(days.map(() => timeSlots.map(() => 'free')))
  }

  function handleMarkAllBusy() {
    setGrid(days.map(() => timeSlots.map(() => 'busy')))
  }

  return (
    <div onMouseUp={handleMouseUp} className="select-none">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-600">
          Click and drag to mark when you're <span className="text-teal-600 font-medium">free</span>
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleMarkAllFree}>All free</Button>
          <Button variant="outline" size="sm" onClick={handleMarkAllBusy}>All busy</Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[400px]">
          {/* Header */}
          <div className="flex ml-14">
            {days.map((day) => (
              <div key={day.toISOString()} className="flex-1 text-center pb-2">
                <p className="text-xs text-gray-500">{format(day, 'EEE')}</p>
                <p className="text-sm font-semibold text-gray-800">{format(day, 'MMM d')}</p>
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex">
            <div className="w-14 flex-shrink-0">
              {timeSlots.map((slot, i) => (
                <div key={i} className="flex items-center justify-end pr-2" style={{ height: 24 }}>
                  {slot.getMinutes() === 0 && (
                    <span className="text-xs text-gray-400">{format(slot, 'ha').toLowerCase()}</span>
                  )}
                </div>
              ))}
            </div>

            {days.map((day, dayIdx) => (
              <div key={day.toISOString()} className="flex-1 border-l border-gray-100">
                {timeSlots.map((_, slotIdx) => (
                  <div
                    key={slotIdx}
                    style={{ height: 24 }}
                    className={cn(
                      'border-b border-gray-100 cursor-pointer transition-colors',
                      grid[dayIdx][slotIdx] === 'free'
                        ? 'bg-teal-200 hover:bg-teal-300'
                        : 'bg-gray-100 hover:bg-gray-200'
                    )}
                    onMouseDown={() => handleMouseDown(dayIdx, slotIdx)}
                    onMouseEnter={() => handleMouseEnter(dayIdx, slotIdx)}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-teal-200" />
              <span className="text-xs text-gray-500">Free</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-200" />
              <span className="text-xs text-gray-500">Busy</span>
            </div>
          </div>
        </div>
      </div>

      <Button
        className="mt-6 w-full bg-teal-600 hover:bg-teal-700 text-white"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? 'Submitting…' : 'Submit My Availability'}
      </Button>
    </div>
  )
}
