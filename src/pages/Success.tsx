import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { MeetingEvent, SchedulingRequest, RequestParticipant, SuggestedSlot } from '@/types'
import { useSchedulingRequest } from '@/hooks/useSchedulingRequest'
import { Button } from '@/components/ui/button'
import { downloadICS, generateInviteText } from '@/lib/icsGenerator'
import { format, parseISO } from 'date-fns'
import { formatDuration } from '@/lib/utils'
import {
  CheckCircle2,
  Download,
  Copy,
  Calendar,
  Clock,
  Users,
  RepeatIcon,
  LayoutDashboard,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

export function Success() {
  const location = useLocation()
  const navigate = useNavigate()
  const { requestId } = useParams<{ requestId: string }>()
  const { getRequest, getParticipants, getMeetingEvent } = useSchedulingRequest()

  const stateData = (location.state || {}) as {
    event?: MeetingEvent
    request?: SchedulingRequest
    participants?: RequestParticipant[]
    slot?: SuggestedSlot
  }

  const [event, setEvent] = useState<MeetingEvent | null>(stateData.event ?? null)
  const [request, setRequest] = useState<SchedulingRequest | null>(stateData.request ?? null)
  const [participants, setParticipants] = useState<RequestParticipant[]>(stateData.participants ?? [])
  const [slot] = useState<SuggestedSlot | undefined>(stateData.slot)
  const [loading, setLoading] = useState(!stateData.event && !!requestId)

  // If no state was passed (e.g. navigated from Dashboard), load from storage
  useEffect(() => {
    if (stateData.event || !requestId) return
    Promise.all([
      getRequest(requestId),
      getParticipants(requestId),
      getMeetingEvent(requestId),
    ]).then(([req, parts, evt]) => {
      setRequest(req)
      setParticipants(parts)
      setEvent(evt)
      setLoading(false)
    })
  }, [requestId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    )
  }

  // Confirmed request exists but no meeting event was ever created
  if (!event && request) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-9 h-9 text-teal-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{request.title}</h1>
        <p className="text-gray-500 text-sm mb-1">
          {format(parseISO(request.window_start), 'MMM d')} — {format(parseISO(request.window_end), 'MMM d, yyyy')}
        </p>
        <p className="text-gray-400 text-sm mb-6">{formatDuration(request.duration_minutes)} · {participants.length} participants</p>
        <p className="text-gray-400 text-sm mb-6">
          No confirmed time slot yet. Go to Results to pick one.
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            className="bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => navigate(`/request/${request.id}/results`)}
          >
            View Results
          </Button>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            Dashboard
          </Button>
        </div>
      </div>
    )
  }

  if (!event || !request) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Meeting not found.</p>
          <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
        </div>
      </div>
    )
  }

  const start = parseISO(event.start_time)
  const end = parseISO(event.end_time)

  function handleDownloadICS() {
    downloadICS(event!, participants)
    toast.success('.ics file downloaded')
  }

  function handleCopyInvite() {
    const text = generateInviteText(event!, participants)
    navigator.clipboard.writeText(text)
      .then(() => toast.success('Invite text copied to clipboard'))
      .catch(() => toast.error('Could not copy — please copy manually'))
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      {/* Success header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-9 h-9 text-teal-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Meeting confirmed!</h1>
        <p className="text-gray-500 text-sm mt-1">
          Download the .ics file to add it to your calendar, or copy the invite text.
        </p>
      </div>

      {/* Meeting summary card */}
      <div className="bg-white border-2 border-teal-200 rounded-2xl p-6 mb-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">{event.title}</h2>

        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">{format(start, 'EEEE, MMMM d, yyyy')}</p>
              {request.type === 'recurring' && (
                <p className="text-xs text-teal-600 mt-0.5">Repeats weekly</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-teal-600 flex-shrink-0" />
            <p>
              {format(start, 'h:mm a')} — {format(end, 'h:mm a')}
              <span className="text-gray-400 ml-2 text-xs">
                ({formatDuration(request.duration_minutes)})
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Users className="w-4 h-4 text-teal-600 flex-shrink-0" />
            <p>{participants.length} participants</p>
          </div>

          {request.type === 'recurring' && event.recurrence_rule && (
            <div className="flex items-center gap-3">
              <RepeatIcon className="w-4 h-4 text-teal-600 flex-shrink-0" />
              <p>Weekly · {request.recurrence_weeks} occurrences</p>
            </div>
          )}

          {event.description && (
            <div className="mt-3 pt-3 border-t border-gray-100 text-gray-600 text-xs">
              {event.description}
            </div>
          )}
        </div>

        {/* Participants list */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Participants</p>
          <div className="space-y-1">
            {participants.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                {p.name || p.email}
                {p.role === 'organizer' && (
                  <span className="text-xs text-gray-400">(organizer)</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Near-miss note */}
        {slot && slot.conflict_count > 0 && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
            <p className="text-xs text-yellow-700">
              Note: {slot.conflicted_names?.join(', ')} {slot.conflict_count === 1 ? 'has' : 'have'} a conflict at this time.
            </p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        <Button
          className="w-full bg-teal-600 hover:bg-teal-700 text-white"
          onClick={handleDownloadICS}
        >
          <Download className="w-4 h-4 mr-2" />
          Download .ics calendar invite
        </Button>

        <Button
          variant="outline"
          className="w-full border-gray-200"
          onClick={handleCopyInvite}
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy invite text
        </Button>

        <Button
          variant="ghost"
          className="w-full text-gray-500"
          onClick={() => navigate('/dashboard')}
        >
          <LayoutDashboard className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      <p className="text-center text-xs text-gray-400 mt-6">
        Scheduled with SchedSync · Privacy-first group scheduling
      </p>
    </div>
  )
}
