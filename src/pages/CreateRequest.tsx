import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useSchedulingRequest } from '@/hooks/useSchedulingRequest'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getBrowserTimezone } from '@/lib/utils'
import { X, Plus, Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format, addDays, addWeeks, parseISO } from 'date-fns'

const DURATIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' },
  { value: 300, label: '5 hours' },
  { value: 360, label: '6 hours' },
]

const HORIZON_WEEKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

export function CreateRequest() {
  const { profile } = useAuth()
  const { createRequest, addParticipant } = useSchedulingRequest()
  const navigate = useNavigate()

  const today = format(new Date(), 'yyyy-MM-dd')
  const defaultStart = format(addDays(new Date(), 1), 'yyyy-MM-dd')

  const [title, setTitle] = useState('Team Meeting')
  const [duration, setDuration] = useState(60)
  const [windowStart, setWindowStart] = useState(defaultStart)
  const [windowEnd, setWindowEnd] = useState(format(addWeeks(new Date(), 2), 'yyyy-MM-dd'))
  const [hoursStart, setHoursStart] = useState('09:00')
  const [hoursEnd, setHoursEnd] = useState('18:00')
  const [timezone] = useState(getBrowserTimezone())
  const [type, setType] = useState<'one_off' | 'recurring'>('one_off')
  const [recurrenceWeeks, setRecurrenceWeeks] = useState(4)
  const [conflictK, setConflictK] = useState(1)
  const [emails, setEmails] = useState<string[]>([''])
  const [loading, setLoading] = useState(false)

  // For recurring, window end is always derived from start + recurrence weeks
  function computedRecurringEnd(start: string, weeks: number) {
    return format(addWeeks(parseISO(start), weeks), 'yyyy-MM-dd')
  }

  function handleTypeChange(t: 'one_off' | 'recurring') {
    setType(t)
    if (t === 'recurring') {
      setWindowEnd(computedRecurringEnd(windowStart, recurrenceWeeks))
    }
  }

  function handleRecurrenceWeeksChange(w: number) {
    setRecurrenceWeeks(w)
    setWindowEnd(computedRecurringEnd(windowStart, w))
  }

  function handleWindowStartChange(val: string) {
    setWindowStart(val)
    if (type === 'recurring') {
      setWindowEnd(computedRecurringEnd(val, recurrenceWeeks))
    }
  }

  function addEmailField() {
    if (emails.length < 7) setEmails([...emails, ''])
  }

  function removeEmail(i: number) {
    setEmails(emails.filter((_, idx) => idx !== i))
  }

  function updateEmail(i: number, val: string) {
    const updated = [...emails]
    updated[i] = val
    setEmails(updated)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return

    const validEmails = emails.map((e) => e.trim()).filter((e) => e && e.includes('@'))
    if (validEmails.length === 0) {
      toast.error('Add at least one participant email')
      return
    }
    if (validEmails.includes(profile.email)) {
      toast.error('You are already included as the organizer')
      return
    }

    setLoading(true)

    const effectiveWindowEnd = type === 'recurring'
      ? computedRecurringEnd(windowStart, recurrenceWeeks)
      : windowEnd

    const request = await createRequest({
      organizer_id: profile.id,
      title: title.trim() || 'Team Meeting',
      duration_minutes: duration,
      window_start: windowStart,
      window_end: effectiveWindowEnd,
      meeting_hours_start: hoursStart,
      meeting_hours_end: hoursEnd,
      timezone,
      type,
      recurrence_weeks: type === 'recurring' ? recurrenceWeeks : undefined,
      conflict_threshold_k: conflictK,
    })

    if (!request) {
      toast.error('Failed to create request')
      setLoading(false)
      return
    }

    await addParticipant({
      request_id: request.id,
      user_id: profile.id,
      email: profile.email,
      name: profile.name,
      role: 'organizer',
      status: 'availability_submitted',
    })

    for (const email of validEmails) {
      await addParticipant({
        request_id: request.id,
        email,
        role: 'required',
        status: 'invited',
      })
    }

    toast.success('Scheduling request created!')
    navigate(`/request/${request.id}/results`)
    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New scheduling request</h1>
          <p className="text-sm text-gray-500">Set up your meeting parameters</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <Label htmlFor="title">Meeting title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Team Meeting"
            className="mt-1"
          />
        </div>

        {/* Duration */}
        <div>
          <Label>Duration</Label>
          <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATIONS.map((d) => (
                <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Meeting type — moved up so date fields can adapt */}
        <div>
          <Label>Meeting type</Label>
          <div className="flex gap-3 mt-1">
            {(['one_off', 'recurring'] as const).map((t) => (
              <button key={t} type="button" onClick={() => handleTypeChange(t)}
                className={cn('flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all',
                  type === t ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                )}>
                {t === 'one_off' ? 'One-off meeting' : 'Recurring (weekly)'}
              </button>
            ))}
          </div>

          {/* Horizon selector — right below type for recurring */}
          {type === 'recurring' && (
            <div className="mt-3">
              <Label>Repeat for how many weeks?</Label>
              <Select value={String(recurrenceWeeks)} onValueChange={(v) => handleRecurrenceWeeksChange(Number(v))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HORIZON_WEEKS.map((w) => (
                    <SelectItem key={w} value={String(w)}>{w} {w === 1 ? 'week' : 'weeks'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Date window — adaptive based on type */}
        {type === 'one_off' ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="winStart">Earliest date</Label>
              <Input id="winStart" type="date" value={windowStart} min={today}
                onChange={(e) => handleWindowStartChange(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="winEnd">Latest date</Label>
              <Input id="winEnd" type="date" value={windowEnd} min={windowStart}
                onChange={(e) => setWindowEnd(e.target.value)} className="mt-1" />
            </div>
          </div>
        ) : (
          <div>
            <Label htmlFor="winStart">Starting from</Label>
            <Input id="winStart" type="date" value={windowStart} min={today}
              onChange={(e) => handleWindowStartChange(e.target.value)} className="mt-1" />
            {/* Auto-computed summary */}
            <p className="text-xs text-teal-700 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2 mt-2">
              Searching for a weekly slot from{' '}
              <strong>{format(parseISO(windowStart), 'MMM d')}</strong> through{' '}
              <strong>{format(parseISO(computedRecurringEnd(windowStart, recurrenceWeeks)), 'MMM d, yyyy')}</strong>
              {' '}({recurrenceWeeks} weeks)
            </p>
          </div>
        )}

        {/* Meeting hours */}
        <div>
          <Label>Acceptable meeting hours</Label>
          <div className="grid grid-cols-2 gap-4 mt-1">
            <div>
              <Input id="hStart" type="time" value={hoursStart}
                onChange={(e) => setHoursStart(e.target.value)} />
            </div>
            <div>
              <Input id="hEnd" type="time" value={hoursEnd}
                onChange={(e) => setHoursEnd(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">Only suggest slots within these hours</p>
        </div>

        {/* Conflict threshold */}
        <div>
          <Label>Flexibility</Label>
          <p className="text-xs text-gray-500 mb-2">
            How strict should the scheduling be?
          </p>
          <div className="flex gap-2">
            {[0, 1, 2].map((k) => (
              <button key={k} type="button" onClick={() => setConflictK(k)}
                className={cn('px-4 py-2 rounded-lg text-sm font-medium border transition-all',
                  conflictK === k ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-400'
                )}>
                {k === 0 ? 'Everyone free' : k === 1 ? '≤1 conflict' : '≤2 conflicts'}
              </button>
            ))}
          </div>
        </div>

        {/* Participants */}
        <div>
          <Label>Participants (email)</Label>
          <p className="text-xs text-gray-500 mb-2">You'll get an invite link to share with them after creating the request</p>
          <div className="space-y-2">
            {emails.map((email, i) => (
              <div key={i} className="flex gap-2">
                <Input type="email" placeholder={`teammate${i + 1}@mit.edu`}
                  value={email} onChange={(e) => updateEmail(i, e.target.value)} />
                {emails.length > 1 && (
                  <button type="button" onClick={() => removeEmail(i)} className="text-gray-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {emails.length < 7 && (
            <button type="button" onClick={addEmailField}
              className="mt-2 flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700">
              <Plus className="w-4 h-4" />
              Add another participant
            </button>
          )}
        </div>

        {/* Submit */}
        <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white" disabled={loading}>
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating request…</>
          ) : (
            'Create request & get invite link'
          )}
        </Button>
      </form>
    </div>
  )
}
