import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useSchedulingRequest } from '@/hooks/useSchedulingRequest'
import { useAvailability } from '@/hooks/useAvailability'
import { SchedulingRequest, Provider } from '@/types'
import { CalendarConnection } from '@/types'
import { ProviderPicker } from '@/components/ProviderPicker'
import { Button } from '@/components/ui/button'
import { CalendarDays, Clock, Users, CheckCircle2, Loader2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'

export function InviteLanding() {
  const { shareToken } = useParams<{ shareToken: string }>()
  const { user, profile } = useAuth()
  const { getRequestByToken, getParticipants, updateParticipantStatus, addParticipant } = useSchedulingRequest()
  const { connectCalendar, disconnectCalendar, getConnections } = useAvailability()
  const navigate = useNavigate()

  const [request, setRequest] = useState<SchedulingRequest | null>(null)
  const [connections, setConnections] = useState<CalendarConnection[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<'connect' | 'done'>('connect')

  useEffect(() => {
    if (!shareToken) return
    getRequestByToken(shareToken).then((req) => {
      setRequest(req)
      setLoading(false)
    })
  }, [shareToken, getRequestByToken])

  useEffect(() => {
    if (profile && request) {
      getConnections(profile.id).then(setConnections)
      // Check if already submitted
      getParticipants(request.id).then((participants) => {
        const me = participants.find((p) => p.email === profile.email || p.user_id === profile.id)
        if (me?.status === 'availability_submitted') setSubmitted(true)
      })
    }
  }, [profile, request, getConnections, getParticipants])

  async function handleConnect(provider: Provider) {
    if (!profile || !request) return
    const conn = await connectCalendar(profile.id, provider, request.window_start, request.window_end)
    setConnections((prev) => [...prev.filter((c) => c.provider !== provider), conn])
    toast.success(`${provider} calendar connected!`)
  }

  async function handleDisconnect(provider: Provider) {
    if (!profile) return
    await disconnectCalendar(profile.id, provider)
    setConnections((prev) => prev.filter((c) => c.provider !== provider))
  }

  async function handleSubmitAvailability() {
    if (!profile || !request) return
    setLoading(true)

    const participants = await getParticipants(request.id)
    let me = participants.find((p) => p.email === profile.email || p.user_id === profile.id)

    if (!me) {
      me = await addParticipant({
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

    setSubmitted(true)
    setStep('done')
    setLoading(false)
    toast.success('Your availability has been shared!')
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CalendarDays className="w-6 h-6 text-teal-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You've been invited to schedule a meeting</h1>
          <p className="text-gray-500 text-sm mb-6">
            Create a SchedSync account to connect your calendar and share your availability — without revealing event details.
          </p>
          <Link to={`/auth?redirect=/invite/${shareToken}`}>
            <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white">
              Sign up to respond
            </Button>
          </Link>
          <p className="text-xs text-gray-400 mt-3">
            Already have an account?{' '}
            <Link to={`/auth?redirect=/invite/${shareToken}`} className="text-teal-600 underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    )
  }

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Invite not found or has expired.</p>
      </div>
    )
  }

  if (step === 'done' || submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-teal-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Availability shared!</h1>
          <p className="text-gray-500 text-sm mb-2">
            Your free/busy data has been included in <strong>{request.title}</strong>.
          </p>
          <p className="text-xs text-gray-400 mb-8">
            The organizer will be notified. You'll receive an email once the meeting is confirmed.
          </p>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  const hasConnected = connections.some((c) => c.status === 'connected')

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      {/* Request summary */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 shadow-sm">
        <h2 className="font-bold text-gray-900 text-lg">{request.title}</h2>
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {request.duration_minutes} min
          </div>
          <div className="flex items-center gap-1">
            <CalendarDays className="w-4 h-4" />
            {format(parseISO(request.window_start), 'MMM d')} — {format(parseISO(request.window_end), 'MMM d')}
          </div>
        </div>
      </div>

      {/* Connect calendars */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-1">Connect your calendar</h3>
        <p className="text-sm text-gray-500 mb-4">
          We'll automatically include your free/busy availability. No event details shared.
        </p>

        <ProviderPicker
          userId={profile?.id || ''}
          connections={connections}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          windowStart={request.window_start}
          windowEnd={request.window_end}
        />

        <div className="mt-6 space-y-3">
          <Button
            className="w-full bg-teal-600 hover:bg-teal-700 text-white"
            onClick={handleSubmitAvailability}
            disabled={!hasConnected || loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Share my availability'}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate(`/invite/${shareToken}/manual`)}
          >
            Enter availability manually instead
          </Button>
        </div>
      </div>
    </div>
  )
}
