import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useSchedulingRequest } from '@/hooks/useSchedulingRequest'
import { useAvailability } from '@/hooks/useAvailability'
import { ManualAvailabilityGrid } from '@/components/ManualAvailabilityGrid'
import { PrivacyBadge } from '@/components/PrivacyBadge'
import { SchedulingRequest } from '@/types'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function ManualAvailability() {
  const { shareToken } = useParams<{ shareToken: string }>()
  const { profile } = useAuth()
  const { getRequestByToken, getParticipants, updateParticipantStatus, addParticipant } = useSchedulingRequest()
  const { saveManualAvailability } = useAvailability()
  const navigate = useNavigate()

  const [request, setRequest] = useState<SchedulingRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!shareToken) return
    getRequestByToken(shareToken).then((req) => {
      setRequest(req)
      setLoading(false)
    })
  }, [shareToken, getRequestByToken])

  async function handleSubmit(freeIntervals: Array<{ start: string; end: string }>) {
    if (!profile || !request) return
    setSubmitting(true)

    try {
      await saveManualAvailability(profile.id, request.id, freeIntervals)

      const participants = await getParticipants(request.id)
      const me = participants.find((p) => p.email === profile.email || p.user_id === profile.id)

      if (!me) {
        await addParticipant({
          request_id: request.id,
          user_id: profile.id,
          email: profile.email,
          name: profile.name,
          role: 'required',
          status: 'availability_submitted',
        })
      } else {
        await updateParticipantStatus(me.id, 'availability_submitted')
      }

      setDone(true)
      toast.success('Your availability has been submitted!')
    } catch {
      toast.error('Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    )
  }

  if (!request) {
    return <div className="p-8 text-center text-gray-500">Invite not found.</div>
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-teal-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Availability submitted!</h2>
          <p className="text-gray-500 text-sm mb-6">
            The organizer will be notified and will send a confirmation once the meeting is scheduled.
          </p>
          <button
            className="text-teal-600 text-sm font-medium underline"
            onClick={() => navigate('/dashboard')}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Enter your availability</h1>
        <p className="text-gray-500 text-sm mt-1">
          For: <strong>{request.title}</strong>
        </p>
      </div>

      <PrivacyBadge variant="banner" className="mb-6" />

      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <p className="text-sm text-gray-600 mb-4">
          Drag to mark the times when you're <span className="text-teal-600 font-medium">free</span>{' '}
          within the meeting window.
        </p>

        <ManualAvailabilityGrid
          windowStart={request.window_start}
          windowEnd={request.window_end}
          meetingHoursStart={request.meeting_hours_start}
          meetingHoursEnd={request.meeting_hours_end}
          onSubmit={handleSubmit}
          loading={submitting}
        />
      </div>
    </div>
  )
}
