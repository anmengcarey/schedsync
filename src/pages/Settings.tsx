import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useAvailability } from '@/hooks/useAvailability'
import { ProviderPicker } from '@/components/ProviderPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarConnection, Provider } from '@/types'
import { BusyInterval } from '@/types'
import { format, addWeeks } from 'date-fns'
import { Loader2, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

const US_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET) — New York, Boston' },
  { value: 'America/Chicago', label: 'Central Time (CT) — Chicago, Dallas' },
  { value: 'America/Denver', label: 'Mountain Time (MT) — Denver, Salt Lake City' },
  { value: 'America/Phoenix', label: 'Mountain Time, no DST (MT) — Phoenix' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT) — Los Angeles, Seattle' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT) — Anchorage' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST) — Honolulu' },
]

const WINDOW_START = format(new Date(), 'yyyy-MM-dd')
const WINDOW_END = format(addWeeks(new Date(), 8), 'yyyy-MM-dd')

export function Settings() {
  const { profile, updateProfile, signOut } = useAuth()
  const { getConnections, connectCalendar, disconnectCalendar } = useAvailability()

  const [name, setName] = useState(profile?.name || '')
  const [timezone, setTimezone] = useState(profile?.timezone || '')
  const [connections, setConnections] = useState<CalendarConnection[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) {
      setName(profile.name)
      setTimezone(profile.timezone)
      getConnections(profile.id).then((c) => {
        setConnections(c)
        setLoading(false)
      })
    }
  }, [profile, getConnections])

  async function handleSaveProfile() {
    setSaving(true)
    await updateProfile({ name, timezone })
    toast.success('Profile updated')
    setSaving(false)
  }

  async function handleConnect(provider: Provider, _icsIntervals?: BusyInterval[]) {
    if (!profile) return
    const conn = await connectCalendar(profile.id, provider, WINDOW_START, WINDOW_END)
    setConnections((prev) => [...prev.filter((c) => c.provider !== provider), conn])
    toast.success(`${provider} connected`)
  }

  async function handleDisconnect(provider: Provider) {
    if (!profile) return
    await disconnectCalendar(profile.id, provider)
    setConnections((prev) => prev.filter((c) => c.provider !== provider))
    toast.success(`${provider} disconnected`)
  }

  function handleDeleteData() {
    if (!window.confirm('Delete all your SchedSync data? This cannot be undone.')) return
    localStorage.clear()
    signOut()
    toast.success('All data deleted')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Settings</h1>

      {/* Profile */}
      <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Display name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="tz">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="tz" className="mt-1">
                <SelectValue placeholder="Select a timezone" />
              </SelectTrigger>
              <SelectContent>
                {US_TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400 mt-1">
              Detected: {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </p>
          </div>
          <Button
            className="bg-teal-600 hover:bg-teal-700 text-white"
            onClick={handleSaveProfile}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save changes
          </Button>
        </div>
      </section>

      {/* Calendars */}
      <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Connected calendars</h2>
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
        ) : (
          <ProviderPicker
            userId={profile?.id || ''}
            connections={connections}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            windowStart={WINDOW_START}
            windowEnd={WINDOW_END}
          />
        )}
      </section>

      {/* Account */}
      <section className="bg-white border border-red-100 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-red-600 mb-2">Danger zone</h2>
        <p className="text-sm text-gray-500 mb-4">
          Deleting your data removes all scheduling requests, calendar connections, and availability data permanently.
        </p>
        <Button
          variant="outline"
          className="border-red-200 text-red-600 hover:bg-red-50"
          onClick={handleDeleteData}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete all my data
        </Button>
      </section>
    </div>
  )
}
