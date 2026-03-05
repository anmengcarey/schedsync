import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSchedulingRequest } from '@/hooks/useSchedulingRequest'
import { SuggestedSlot, SchedulingRequest, RequestParticipant } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { format, parseISO } from 'date-fns'
import { formatDuration } from '@/lib/utils'
import { ArrowLeft, Calendar, Clock, Users, RepeatIcon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function Confirm() {
  const navigate = useNavigate()
  const location = useLocation()
  const { createMeetingEvent, updateRequestStatus } = useSchedulingRequest()

  const { slot, request, participants } = (location.state || {}) as {
    slot: SuggestedSlot
    request: SchedulingRequest
    participants: RequestParticipant[]
  }

  const [title, setTitle] = useState(request?.title || 'Team Meeting')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  if (!slot || !request) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">No meeting details found. Go back and select a time.</p>
      </div>
    )
  }

  const start = parseISO(slot.start_time)
  const end = parseISO(slot.end_time)

  async function handleConfirm() {
    setLoading(true)

    try {
      const rrule = request.type === 'recurring'
        ? `FREQ=WEEKLY;COUNT=${request.recurrence_weeks || 4}`
        : undefined

      const event = await createMeetingEvent({
        request_id: request.id,
        slot_id: slot.id,
        title,
        description: description || undefined,
        start_time: slot.start_time,
        end_time: slot.end_time,
        timezone: request.timezone,
        recurrence_rule: rrule,
        status: 'confirmed',
      })

      await updateRequestStatus(request.id, 'confirmed')

      navigate(`/request/${request.id}/success`, {
        state: { event, request, participants, slot },
      })
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Confirm meeting</h1>
          <p className="text-sm text-gray-500">Review and confirm the details</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Meeting time summary card */}
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-teal-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">{format(start, 'EEEE, MMMM d, yyyy')}</p>
                {request.type === 'recurring' && (
                  <p className="text-xs text-teal-600">Repeats weekly for {request.recurrence_weeks} weeks</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-teal-600 flex-shrink-0" />
              <p className="text-gray-700">
                {format(start, 'h:mm a')} — {format(end, 'h:mm a')}
                <span className="text-gray-500 text-sm ml-2">
                  ({formatDuration(request.duration_minutes)})
                </span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-teal-600 flex-shrink-0" />
              <p className="text-gray-700">{participants.length} participants</p>
            </div>

            {request.type === 'recurring' && (
              <div className="flex items-center gap-3">
                <RepeatIcon className="w-5 h-5 text-teal-600 flex-shrink-0" />
                <p className="text-gray-700">Weekly · {request.recurrence_weeks} occurrences</p>
              </div>
            )}

            {slot.conflict_count > 0 && (
              <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                <p className="text-xs text-yellow-700">
                  ⚠ {slot.conflicted_names?.join(', ')} {slot.conflict_count === 1 ? 'has' : 'have'} a conflict at this time
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Edit title */}
        <div>
          <Label htmlFor="title">Meeting title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1"
          />
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="desc">Description / agenda <span className="text-gray-400">(optional)</span></Label>
          <Textarea
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add meeting agenda, location, Zoom link…"
            className="mt-1 resize-none"
            rows={3}
          />
        </div>

        {/* Participants list */}
        <div>
          <Label>Participants</Label>
          <div className="mt-2 space-y-1.5">
            {participants.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0" />
                <span>{p.name || p.email}</span>
                {p.role === 'organizer' && <span className="text-xs text-gray-400">(organizer)</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => navigate(-1)}>
            Back
          </Button>
          <Button
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Confirming…
              </>
            ) : (
              'Confirm & send invites'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
