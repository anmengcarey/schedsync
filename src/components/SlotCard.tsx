import { format, parseISO } from 'date-fns'
import { Star, AlertCircle, Users } from 'lucide-react'
import { SuggestedSlot } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn, formatDuration } from '@/lib/utils'

interface SlotCardProps {
  slot: SuggestedSlot
  duration: number
  timezone: string
  onSelect: (slot: SuggestedSlot) => void
  selected?: boolean
}

export function SlotCard({ slot, duration, timezone, onSelect, selected }: SlotCardProps) {
  const start = parseISO(slot.start_time)
  const dateStr = format(start, 'EEEE, MMMM d')
  const timeStr = `${format(start, 'h:mm a')} — ${format(parseISO(slot.end_time), 'h:mm a')}`

  return (
    <div
      className={cn(
        'border-2 rounded-xl p-4 transition-all cursor-pointer',
        selected
          ? 'border-teal-500 bg-teal-50 shadow-md'
          : slot.is_near_miss
          ? 'border-yellow-200 bg-yellow-50 hover:border-yellow-300'
          : 'border-gray-200 bg-white hover:border-teal-300 hover:shadow-sm'
      )}
      onClick={() => onSelect(slot)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Rank badge */}
          <div className="flex items-center gap-2 mb-2">
            {slot.rank === 1 && (
              <div className="flex items-center gap-1 bg-teal-100 text-teal-700 rounded-full px-2 py-0.5">
                <Star className="w-3 h-3 fill-current" />
                <span className="text-xs font-semibold">Best option</span>
              </div>
            )}
            {slot.is_near_miss && (
              <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-300">
                Near miss
              </Badge>
            )}
          </div>

          {/* Date & time */}
          <p className="text-sm font-semibold text-gray-900">{dateStr}</p>
          <p className="text-sm text-gray-600 mt-0.5">{timeStr}</p>
          <p className="text-xs text-gray-400 mt-0.5">{formatDuration(duration)} · {timezone}</p>

          {/* Recurring viability */}
          {slot.viability_label && (
            <p className="text-xs text-teal-600 mt-1.5 font-medium">{slot.viability_label}</p>
          )}

          {/* Conflict info */}
          {slot.conflict_count > 0 && slot.conflicted_names && (
            <div className="flex items-center gap-1 mt-2 text-yellow-700">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs">
                {slot.conflicted_names.join(', ')} {slot.conflict_count === 1 ? 'has' : 'have'} a conflict
              </span>
            </div>
          )}

          {slot.conflict_count === 0 && (
            <div className="flex items-center gap-1 mt-2 text-teal-600">
              <Users className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Everyone is free</span>
            </div>
          )}
        </div>

        <Button
          size="sm"
          className={cn(
            'flex-shrink-0 text-xs',
            selected
              ? 'bg-teal-600 hover:bg-teal-700 text-white'
              : 'bg-white border border-gray-200 text-gray-700 hover:border-teal-400 hover:text-teal-700'
          )}
          onClick={(e) => { e.stopPropagation(); onSelect(slot) }}
        >
          {selected ? 'Selected' : 'Select'}
        </Button>
      </div>
    </div>
  )
}
