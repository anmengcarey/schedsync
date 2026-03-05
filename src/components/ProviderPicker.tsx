import { useState } from 'react'
import { Check, Loader2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Provider, CalendarConnection } from '@/types'
import { PrivacyBadge } from '@/components/PrivacyBadge'
import { cn } from '@/lib/utils'
import { parseICSFile } from '@/lib/mockDataGenerator'
import { BusyInterval } from '@/types'

interface ProviderOption {
  id: Provider
  name: string
  tagline: string
  color: string
  logo: string
}

const PROVIDERS: ProviderOption[] = [
  {
    id: 'google',
    name: 'Google Calendar',
    tagline: 'Connect via Google account',
    color: '#4285F4',
    logo: 'G',
  },
  {
    id: 'outlook',
    name: 'Microsoft Outlook',
    tagline: 'Connect via Microsoft account',
    color: '#0078D4',
    logo: 'O',
  },
  {
    id: 'apple',
    name: 'Apple Calendar',
    tagline: 'Upload your .ics export',
    color: '#555555',
    logo: '',
  },
  {
    id: 'other',
    name: 'Other Calendar',
    tagline: 'Any CalDAV-compatible calendar',
    color: '#6B7280',
    logo: '☰',
  },
]

interface ProviderPickerProps {
  userId: string
  connections: CalendarConnection[]
  onConnect: (provider: Provider, icsIntervals?: BusyInterval[]) => Promise<void>
  onDisconnect: (provider: Provider) => Promise<void>
  windowStart?: string
  windowEnd?: string
}

export function ProviderPicker({
  userId,
  connections,
  onConnect,
  onDisconnect,
}: ProviderPickerProps) {
  const [connecting, setConnecting] = useState<Provider | null>(null)
  const [appleStep, setAppleStep] = useState<'idle' | 'upload' | 'done'>('idle')

  const isConnected = (provider: Provider) =>
    connections.some((c) => c.provider === provider && c.status === 'connected')

  async function handleConnect(provider: Provider) {
    if (provider === 'apple') {
      setAppleStep('upload')
      return
    }
    setConnecting(provider)
    await onConnect(provider)
    setConnecting(null)
  }

  async function handleDisconnect(provider: Provider) {
    await onDisconnect(provider)
  }

  async function handleICSUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setConnecting('apple')
    setAppleStep('done')

    try {
      const content = await file.text()
      const intervals = parseICSFile(content, userId)
      await onConnect('apple', intervals)
    } catch {
      await onConnect('apple') // fallback to mock
    } finally {
      setConnecting(null)
    }
  }

  async function handleSkipApple() {
    setConnecting('apple')
    setAppleStep('done')
    await onConnect('apple')
    setConnecting(null)
  }

  return (
    <div className="space-y-4">
      <PrivacyBadge variant="banner" />

      <div className="grid gap-3">
        {PROVIDERS.map((provider) => {
          const connected = isConnected(provider.id)
          const isLoading = connecting === provider.id

          if (provider.id === 'apple' && appleStep === 'upload' && !connected) {
            return (
              <div key={provider.id} className="border-2 border-dashed border-teal-300 rounded-xl p-5 bg-teal-50">
                <p className="text-sm font-medium text-gray-800 mb-1">Upload your Apple Calendar export</p>
                <p className="text-xs text-gray-500 mb-3">
                  In Apple Calendar: File → Export → Export… → select a date range → save the .ics file
                </p>
                <div className="flex gap-2">
                  <label className="cursor-pointer">
                    <input type="file" accept=".ics" onChange={handleICSUpload} className="hidden" />
                    <div className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">
                      <Upload className="w-4 h-4" />
                      Choose .ics file
                    </div>
                  </label>
                  <Button variant="outline" size="sm" onClick={handleSkipApple}>
                    Use demo data instead
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setAppleStep('idle')}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )
          }

          return (
            <div
              key={provider.id}
              className={cn(
                'flex items-center justify-between p-4 rounded-xl border-2 transition-all',
                connected
                  ? 'border-teal-200 bg-teal-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              )}
            >
              <div className="flex items-center gap-3">
                {/* Provider logo */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: provider.color }}
                >
                  {provider.id === 'apple' ? (
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                    </svg>
                  ) : (
                    provider.logo
                  )}
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-900">{provider.name}</p>
                  <p className="text-xs text-gray-500">{provider.tagline}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {connected ? (
                  <>
                    <div className="flex items-center gap-1 text-teal-600">
                      <Check className="w-4 h-4" />
                      <span className="text-xs font-medium">Connected</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-red-500 text-xs"
                      onClick={() => handleDisconnect(provider.id)}
                    >
                      Remove
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    className="bg-teal-600 hover:bg-teal-700 text-white text-xs"
                    onClick={() => handleConnect(provider.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Connecting…
                      </>
                    ) : (
                      'Connect'
                    )}
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
