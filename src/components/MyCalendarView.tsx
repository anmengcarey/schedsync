import { useState } from 'react'
import { parseISO, startOfWeek, addDays, format, getHours, getMinutes, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { BusyInterval, CalendarConnection, Provider } from '@/types'
import { getMockEventName } from '@/lib/mockDataGenerator'
import { Button } from '@/components/ui/button'

const PROVIDER_COLORS: Record<Provider, string> = {
  google: 'bg-emerald-500',
  outlook: 'bg-blue-500',
  apple: 'bg-slate-500',
  other: 'bg-purple-500',
}

const PROVIDER_DOT_COLORS: Record<Provider, string> = {
  google: 'bg-emerald-500',
  outlook: 'bg-blue-500',
  apple: 'bg-slate-500',
  other: 'bg-purple-500',
}

const PROVIDER_LABELS: Record<Provider, string> = {
  google: 'Google',
  outlook: 'Outlook',
  apple: 'Apple',
  other: 'Other',
}

const FALLBACK_COLORS: string[] = ['bg-emerald-500', 'bg-blue-500', 'bg-slate-500', 'bg-purple-500']

// Grid range: 8 AM to 8 PM (20:00)
const START_HOUR = 8
const END_HOUR = 20
const TOTAL_HOURS = END_HOUR - START_HOUR
const ROW_HEIGHT_PX = 48 // px per hour

interface Props {
  connections: CalendarConnection[]
  busyIntervals: BusyInterval[]
}

export function MyCalendarView({ connections, busyIntervals }: Props) {
  const [weekOffset, setWeekOffset] = useState(0)

  const today = new Date()
  const weekStart = addDays(startOfWeek(today, { weekStartsOn: 1 }), weekOffset * 7)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Build a map from connection id -> provider for quick lookup
  const connMap = new Map<string, CalendarConnection>(connections.map((c) => [c.id, c]))

  function getColorForInterval(interval: BusyInterval, index: number): string {
    if (interval.calendar_connection_id) {
      const conn = connMap.get(interval.calendar_connection_id)
      if (conn) return PROVIDER_COLORS[conn.provider]
    }
    // Fallback: cycle through colors by index
    return FALLBACK_COLORS[index % FALLBACK_COLORS.length]
  }

  // Filter intervals that fall within this week
  const weekIntervals = busyIntervals.filter((interval) => {
    const start = parseISO(interval.start_time)
    return weekDays.some((day) => isSameDay(day, start))
  })

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i)

  const activeProviders = Array.from(new Set(
    connections
      .filter((c) => c.status === 'connected')
      .map((c) => c.provider)
  ))

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold text-gray-900">My Calendar</h2>
          {activeProviders.length > 0 && (
            <div className="flex items-center gap-3">
              {activeProviders.map((provider) => (
                <div key={provider} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${PROVIDER_DOT_COLORS[provider]}`} />
                  <span className="text-xs text-gray-500">{PROVIDER_LABELS[provider]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">
            {format(weekStart, 'MMM d')} – {format(weekDays[6], 'MMM d, yyyy')}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            onClick={() => setWeekOffset(0)}
            disabled={weekOffset === 0}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setWeekOffset((o) => o - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setWeekOffset((o) => o + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Day header row */}
      <div className="flex border-b border-gray-100">
        <div className="w-14 flex-shrink-0" />
        {weekDays.map((day) => {
          const isToday = isSameDay(day, today)
          return (
            <div key={day.toISOString()} className="flex-1 text-center py-2">
              <div className="text-xs text-gray-400 uppercase tracking-wide">{format(day, 'EEE')}</div>
              <div
                className={`text-sm font-semibold mx-auto w-7 h-7 flex items-center justify-center rounded-full mt-0.5 ${
                  isToday ? 'bg-teal-600 text-white' : 'text-gray-700'
                }`}
              >
                {format(day, 'd')}
              </div>
            </div>
          )
        })}
      </div>

      {/* Grid */}
      <div className="overflow-auto" style={{ maxHeight: 520 }}>
        <div className="flex">
          {/* Time column */}
          <div className="w-14 flex-shrink-0 relative" style={{ height: TOTAL_HOURS * ROW_HEIGHT_PX }}>
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute text-xs text-gray-400 text-right pr-2 leading-none"
                style={{ top: (hour - START_HOUR) * ROW_HEIGHT_PX - 6, right: 0, width: '100%' }}
              >
                {hour === 12 ? '12pm' : hour < 12 ? `${hour}am` : `${hour - 12}pm`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day) => {
            const dayIntervals = weekIntervals.filter((i) => isSameDay(parseISO(i.start_time), day))

            return (
              <div
                key={day.toISOString()}
                className="flex-1 relative border-l border-gray-100"
                style={{ height: TOTAL_HOURS * ROW_HEIGHT_PX }}
              >
                {/* Hour grid lines */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="absolute w-full border-t border-gray-100"
                    style={{ top: (hour - START_HOUR) * ROW_HEIGHT_PX }}
                  />
                ))}

                {/* Events */}
                {dayIntervals.map((interval, idx) => {
                  const start = parseISO(interval.start_time)
                  const end = parseISO(interval.end_time)

                  const startHour = getHours(start) + getMinutes(start) / 60
                  const endHour = getHours(end) + getMinutes(end) / 60

                  const clampedStart = Math.max(startHour, START_HOUR)
                  const clampedEnd = Math.min(endHour, END_HOUR)

                  if (clampedStart >= clampedEnd) return null

                  const top = (clampedStart - START_HOUR) * ROW_HEIGHT_PX
                  const height = Math.max((clampedEnd - clampedStart) * ROW_HEIGHT_PX, 18)
                  const color = getColorForInterval(interval, idx)
                  const provider = interval.calendar_connection_id
                    ? connMap.get(interval.calendar_connection_id)?.provider
                    : undefined
                  const name = getMockEventName(interval.start_time, provider)

                  return (
                    <div
                      key={interval.id}
                      className={`absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-white overflow-hidden ${color}`}
                      style={{ top, height }}
                      title={name}
                    >
                      <p className="text-xs font-medium leading-tight truncate">{name}</p>
                      {height > 30 && (
                        <p className="text-xs opacity-80 leading-tight">
                          {format(start, 'h:mm')}–{format(end, 'h:mm a')}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
