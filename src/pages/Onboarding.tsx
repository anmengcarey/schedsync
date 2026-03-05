import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useAvailability } from '@/hooks/useAvailability'
import { ProviderPicker } from '@/components/ProviderPicker'
import { Button } from '@/components/ui/button'
import { CalendarConnection, Provider } from '@/types'
import { BusyInterval } from '@/types'
import { format, addWeeks } from 'date-fns'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

// Generate a 8-week window for initial mock data
const WINDOW_START = format(new Date(), 'yyyy-MM-dd')
const WINDOW_END = format(addWeeks(new Date(), 8), 'yyyy-MM-dd')

export function Onboarding() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { connectCalendar, disconnectCalendar, getConnections } = useAvailability()
  const [connections, setConnections] = useState<CalendarConnection[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (profile) {
      getConnections(profile.id).then(setConnections)
    }
  }, [profile, getConnections])

  async function handleConnect(provider: Provider, icsIntervals?: BusyInterval[]) {
    if (!profile) return
    try {
      const conn = await connectCalendar(profile.id, provider, WINDOW_START, WINDOW_END)
      setConnections((prev) => {
        const filtered = prev.filter((c) => !(c.provider === provider))
        return [...filtered, conn]
      })
      toast.success(`${providerName(provider)} connected!`)
    } catch {
      toast.error('Connection failed. Please try again.')
    }
  }

  async function handleDisconnect(provider: Provider) {
    if (!profile) return
    await disconnectCalendar(profile.id, provider)
    setConnections((prev) => prev.filter((c) => c.provider !== provider))
    toast.success(`${providerName(provider)} disconnected`)
  }

  function handleContinue() {
    navigate('/dashboard')
  }

  function handleSkip() {
    navigate('/dashboard')
  }

  const hasConnections = connections.some((c) => c.status === 'connected')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
            <span className="text-sm text-teal-600 font-medium">Account created</span>
          </div>
          <div className="w-8 h-px bg-gray-300" />
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-teal-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">2</span>
            </div>
            <span className="text-sm font-medium text-gray-900">Connect calendars</span>
          </div>
          <div className="w-8 h-px bg-gray-300" />
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500 text-xs font-bold">3</span>
            </div>
            <span className="text-sm text-gray-400">Dashboard</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Connect your calendars</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Connect one or more calendars so SchedSync can find when you're free — without seeing event details.
            </p>
          </div>

          <ProviderPicker
            userId={profile?.id || ''}
            connections={connections}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            windowStart={WINDOW_START}
            windowEnd={WINDOW_END}
          />

          <div className="mt-8 flex flex-col gap-3">
            <Button
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              onClick={handleContinue}
              disabled={!hasConnections}
            >
              Continue to Dashboard
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button variant="ghost" className="w-full text-gray-500" onClick={handleSkip}>
              Skip for now — I'll connect later
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          You can always add or remove calendars in Settings
        </p>
      </div>
    </div>
  )
}

function providerName(provider: Provider): string {
  return { google: 'Google Calendar', outlook: 'Outlook', apple: 'Apple Calendar', other: 'Calendar' }[provider]
}
