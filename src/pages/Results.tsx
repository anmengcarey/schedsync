import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useSchedulingRequest } from '@/hooks/useSchedulingRequest'
import { useAvailability } from '@/hooks/useAvailability'
import { SchedulingRequest, RequestParticipant, SuggestedSlot, BusyInterval } from '@/types'
import { SlotCard } from '@/components/SlotCard'
import { AvailabilityMap } from '@/components/AvailabilityMap'
import { ParticipantStatusList } from '@/components/ParticipantStatusList'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { computeSuggestedSlots, buildParticipantIntervals, computeRecurringViability } from '@/lib/overlapEngine'
import { Loader2, RefreshCw, ArrowRight, LinkIcon, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

export function Results() {
  const { requestId } = useParams<{ requestId: string }>()
  const { profile } = useAuth()
  const { getRequest, getParticipants, saveSuggestedSlots, getSuggestedSlots } = useSchedulingRequest()
  const { getAllBusyIntervalsForRequest } = useAvailability()
  const navigate = useNavigate()

  const [request, setRequest] = useState<SchedulingRequest | null>(null)
  const [participants, setParticipants] = useState<RequestParticipant[]>([])
  const [slots, setSlots] = useState<SuggestedSlot[]>([])
  const [busyIntervals, setBusyIntervals] = useState<BusyInterval[]>([])
  const [selectedSlot, setSelectedSlot] = useState<SuggestedSlot | null>(null)
  const [loading, setLoading] = useState(true)
  const [computing, setComputing] = useState(false)

  useEffect(() => {
    if (!requestId) return
    loadData()
  }, [requestId])

  async function loadData() {
    if (!requestId) return
    setLoading(true)

    const [req, parts] = await Promise.all([
      getRequest(requestId),
      getParticipants(requestId),
    ])

    if (!req) { setLoading(false); return }
    setRequest(req)
    setParticipants(parts)

    const userIds = parts.filter((p) => p.user_id).map((p) => p.user_id!)
    const intervals = await getAllBusyIntervalsForRequest(userIds)
    setBusyIntervals(intervals)

    // Check for existing slots, else compute
    const existing = await getSuggestedSlots(requestId)
    if (existing.length > 0) {
      setSlots(existing)
    } else {
      await computeSlots(req, parts, intervals)
    }

    setLoading(false)
  }

  async function computeSlots(
    req: SchedulingRequest,
    parts: RequestParticipant[],
    intervals: BusyInterval[]
  ) {
    setComputing(true)
    const participantData = buildParticipantIntervals(parts, intervals)
    let computed = computeSuggestedSlots(req, participantData)

    // Add recurring viability labels
    if (req.type === 'recurring') {
      computed = computed.map((slot) => {
        const { label } = computeRecurringViability(slot, req, participantData)
        return { ...slot, viability_label: label }
      })
    }

    await saveSuggestedSlots(computed)
    setSlots(computed)
    setComputing(false)
  }

  async function handleRefresh() {
    if (!request) return
    const userIds = participants.filter((p) => p.user_id).map((p) => p.user_id!)
    const intervals = await getAllBusyIntervalsForRequest(userIds)
    setBusyIntervals(intervals)
    await computeSlots(request, participants, intervals)
    toast.success('Availability refreshed')
  }

  function handleConfirm() {
    if (!selectedSlot) {
      toast.error('Please select a time slot first')
      return
    }
    navigate(`/request/${requestId}/confirm`, { state: { slot: selectedSlot, request, participants } })
  }

  const inviteUrl = request ? `${window.location.origin}/invite/${request.share_token}` : ''
  const respondedCount = participants.filter((p) => p.status === 'availability_submitted').length
  const totalCount = participants.length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    )
  }

  if (!request) {
    return <div className="p-8 text-center text-gray-500">Request not found.</div>
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{request.title}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {respondedCount} of {totalCount} participants have responded
        </p>
      </div>

      {/* Invite link banner */}
      {request.organizer_id === profile?.id && (
        <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl p-4 mb-6">
          <div>
            <p className="text-sm font-medium text-teal-800">Share the invite link with your team</p>
            <p className="text-xs text-teal-600 truncate mt-0.5">{inviteUrl}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-teal-300 text-teal-700 hover:bg-teal-100 flex-shrink-0 ml-3"
            onClick={() => {
              navigator.clipboard.writeText(inviteUrl).catch(() => {})
              toast.success('Copied!')
            }}
          >
            <LinkIcon className="w-3.5 h-3.5 mr-1.5" />
            Copy link
          </Button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Slots + map */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="slots">
            <TabsList className="bg-gray-100">
              <TabsTrigger value="slots">Suggested times</TabsTrigger>
              <TabsTrigger value="map">Availability map</TabsTrigger>
            </TabsList>

            <TabsContent value="slots" className="mt-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-700">
                  {computing ? 'Computing best times…' : `${slots.length} slot${slots.length !== 1 ? 's' : ''} found`}
                </h2>
                <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={computing}>
                  <RefreshCw className={`w-4 h-4 mr-1.5 ${computing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>

              {computing ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
                </div>
              ) : slots.length === 0 ? (
                <NoSlotsState request={request} />
              ) : (
                <div className="space-y-3">
                  {slots.map((slot) => (
                    <SlotCard
                      key={slot.id}
                      slot={slot}
                      duration={request.duration_minutes}
                      timezone={request.timezone}
                      onSelect={setSelectedSlot}
                      selected={selectedSlot?.id === slot.id}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="map" className="mt-4">
              <AvailabilityMap
                windowStart={request.window_start}
                windowEnd={request.window_end}
                meetingHoursStart={request.meeting_hours_start}
                meetingHoursEnd={request.meeting_hours_end}
                participants={participants}
                busyIntervals={busyIntervals}
                suggestedSlots={slots}
                durationMinutes={request.duration_minutes}
              />
            </TabsContent>
          </Tabs>

          {/* Confirm button */}
          {slots.length > 0 && (
            <Button
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              onClick={handleConfirm}
              disabled={!selectedSlot}
            >
              {selectedSlot ? 'Confirm this time' : 'Select a time to confirm'}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Right: Participants */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Participant responses</h3>
            <ParticipantStatusList participants={participants} showRole />
          </div>

          {/* Request details */}
          <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
            <p><span className="font-medium text-gray-700">Duration:</span> {request.duration_minutes} min</p>
            <p><span className="font-medium text-gray-700">Window:</span> {request.window_start} to {request.window_end}</p>
            <p><span className="font-medium text-gray-700">Hours:</span> {request.meeting_hours_start}–{request.meeting_hours_end}</p>
            <p><span className="font-medium text-gray-700">Timezone:</span> {request.timezone}</p>
            {request.type === 'recurring' && (
              <p><span className="font-medium text-gray-700">Recurring:</span> {request.recurrence_weeks} weeks</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function NoSlotsState({ request }: { request: SchedulingRequest }) {
  return (
    <div className="text-center py-12 bg-amber-50 rounded-xl border border-amber-200">
      <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
      <p className="font-semibold text-gray-900">No perfect overlap found</p>
      <p className="text-sm text-gray-500 mt-1 mb-4">
        Try relaxing constraints: extend the date window, widen meeting hours, or allow more conflicts.
      </p>
      <div className="flex gap-2 justify-center flex-wrap text-xs text-gray-500">
        <span className="bg-white border rounded-full px-3 py-1">Current K = {request.conflict_threshold_k}</span>
        <span className="bg-white border rounded-full px-3 py-1">Window: {request.window_start} → {request.window_end}</span>
        <span className="bg-white border rounded-full px-3 py-1">Hours: {request.meeting_hours_start}–{request.meeting_hours_end}</span>
      </div>
    </div>
  )
}
