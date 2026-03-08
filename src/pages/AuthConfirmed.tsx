import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function AuthConfirmed() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Exchange PKCE code for session if present in URL
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).finally(() => setReady(true))
    } else {
      setReady(true)
    }
  }, [])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-teal-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Email confirmed!</h1>
        <p className="text-gray-500 text-sm mb-8">
          Your SchedSync account is ready. Let's get started.
        </p>
        <Button
          className="w-full bg-teal-600 hover:bg-teal-700 text-white"
          onClick={() => navigate(user ? '/onboarding' : '/auth')}
        >
          {user ? 'Continue to setup' : 'Sign in'}
        </Button>
      </div>
    </div>
  )
}
