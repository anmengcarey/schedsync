import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useSchedulingRequest } from '@/hooks/useSchedulingRequest'
import { useAvailability } from '@/hooks/useAvailability'
import { SchedulingRequest, CalendarConnection, BusyInterval } from '@/types'
import { RequestStatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { MyCalendarView } from '@/components/MyCalendarView'
import { Plus, CalendarDays, Clock, LinkIcon, AlertCircle, XCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'

export function Dashboard() {
  const { profile } = useAuth()
  const { getUserRequests, updateRequestStatus } = useSchedulingRequest()
  const { getConnections, getUserBusyIntervals } = useAvailability()
  const navigate = useNavigate()

  const [requests, setRequests] = useState<SchedulingRequest[]>([])
  const [connections, setConnections] = useState<CalendarConnection[]>([])
  const [busyIntervals, setBusyIntervals] = useState<BusyInterval[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'requests' | 'calendar'>('requests')

  useEffect(() => {
    if (!profile) return
    Promise.all([
      getUserRequests(profile.id),
      getConnections(profile.id),
      getUserBusyIntervals(profile.id),
    ]).then(([reqs, conns, intervals]) => {
      setRequests(reqs)
      setConnections(conns)
      setBusyIntervals(intervals)
      setLoading(false)
    })
  }, [profile, getUserRequests, getConnections, getUserBusyIntervals])

  const hasCalendar = connections.some((c) => c.status === 'connected')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {profile?.name.split(' ')[0]}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Here are your scheduling requests</p>
        </div>
        <Button
          className="bg-teal-600 hover:bg-teal-700 text-white"
          onClick={() => navigate('/create')}
        >
          <Plus className="w-4 h-4 mr-2" />
          New request
        </Button>
      </div>

      {/* Calendar connection warning */}
      {!hasCalendar && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">No calendar connected</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Connect a calendar so others can see your availability.{' '}
              <Link to="/settings" className="underline font-medium">
                Connect now →
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Connected calendars pill */}
      {hasCalendar && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-gray-500">Connected:</span>
          {connections
            .filter((c) => c.status === 'connected')
            .map((c) => (
              <span
                key={c.id}
                className="text-xs bg-teal-50 text-teal-700 border border-teal-200 rounded-full px-3 py-1 font-medium"
              >
                {providerLabel(c.provider)}
              </span>
            ))}
          <Link to="/settings" className="text-xs text-gray-400 hover:text-teal-600 underline">
            Manage
          </Link>
        </div>
      )}

      {/* Tab toggle */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'requests'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('requests')}
        >
          Requests
        </button>
        {hasCalendar && (
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'calendar'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('calendar')}
          >
            My Calendar
          </button>
        )}
      </div>

      {/* Tab content */}
      {activeTab === 'calendar' && hasCalendar ? (
        <MyCalendarView connections={connections} busyIntervals={busyIntervals} />
      ) : (
        <>
          {requests.length === 0 ? (
            <EmptyState onNew={() => navigate('/create')} />
          ) : (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Your requests
              </h2>
              {requests.map((req) => (
                <RequestCard
                  key={req.id}
                  request={req}
                  userId={profile?.id || ''}
                  onCancel={async () => {
                    if (!window.confirm(`Cancel "${req.title}"? This cannot be undone.`)) return
                    await updateRequestStatus(req.id, 'cancelled')
                    setRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, status: 'cancelled' } : r))
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function RequestCard({ request, userId, onCancel }: { request: SchedulingRequest; userId: string; onCancel: () => void }) {
  const navigate = useNavigate()
  const isOrganizer = request.organizer_id === userId
  const inviteUrl = `${window.location.origin}/invite/${request.share_token}`

  const statusToPath: Record<string, string> = {
    active: `/request/${request.id}/results`,
    confirmed: `/request/${request.id}/success`,
    draft: `/request/${request.id}/results`,
  }

  return (
    <div
      className="bg-white border border-gray-200 rounded-xl p-5 hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer"
      onClick={() => navigate(statusToPath[request.status] || `/request/${request.id}/results`)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <RequestStatusBadge status={request.status} />
            {!isOrganizer && (
              <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">Invited</span>
            )}
            {request.type === 'recurring' && (
              <span className="text-xs bg-purple-100 text-purple-700 rounded-full px-2 py-0.5">Recurring</span>
            )}
          </div>

          <h3 className="font-semibold text-gray-900 truncate">{request.title}</h3>

          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              {request.duration_minutes} min
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <CalendarDays className="w-3.5 h-3.5" />
              {format(parseISO(request.window_start), 'MMM d')} — {format(parseISO(request.window_end), 'MMM d')}
            </div>
            {request.type === 'recurring' && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span>Next {request.recurrence_weeks} weeks</span>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons (organizer only) */}
        {isOrganizer && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {request.status === 'active' && (
              <button
                className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 border border-teal-200 rounded-lg px-3 py-1.5 hover:bg-teal-50 transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  navigator.clipboard.writeText(inviteUrl)
                    .then(() => alert('Invite link copied!'))
                    .catch(() => {})
                }}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                Copy invite link
              </button>
            )}
            {request.status !== 'cancelled' && (
              <button
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  onCancel()
                }}
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancel
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 text-xs text-gray-400">
        Created {format(parseISO(request.created_at), 'MMM d, yyyy')}
      </div>
    </div>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <CalendarDays className="w-8 h-8 text-teal-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No scheduling requests yet</h3>
      <p className="text-gray-500 text-sm mb-6">
        Create your first request to find the perfect meeting time for your team.
      </p>
      <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={onNew}>
        <Plus className="w-4 h-4 mr-2" />
        Create scheduling request
      </Button>
    </div>
  )
}

function providerLabel(provider: string): string {
  return { google: 'Google', outlook: 'Outlook', apple: 'Apple', other: 'Other' }[provider] || provider
}
