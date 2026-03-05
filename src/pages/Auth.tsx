import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CalendarDays, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function Auth() {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    if (tab === 'signup') {
      if (!name.trim()) {
        toast.error('Please enter your name')
        setLoading(false)
        return
      }
      const { error } = await signUp(email, password, name)
      if (error) {
        toast.error(error.message)
        setLoading(false)
        return
      }
      toast.success('Account created!')
      navigate('/onboarding')
    } else {
      const { error } = await signIn(email, password)
      if (error) {
        toast.error(error.message)
        setLoading(false)
        return
      }
      navigate('/dashboard')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
              <CalendarDays className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-2xl text-gray-900">
              Sched<span className="text-teal-600">Sync</span>
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {/* Tabs */}
          <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
            {(['signin', 'signup'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 py-2 text-sm font-medium rounded-lg transition-all',
                  tab === t
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {t === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'signup' && (
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Alex Chen"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="alex@mit.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder={tab === 'signup' ? 'At least 8 characters' : '••••••••'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="mt-1"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700 text-white mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {tab === 'signup' ? 'Creating account…' : 'Signing in…'}
                </>
              ) : (
                tab === 'signup' ? 'Create account' : 'Sign in'
              )}
            </Button>
          </form>

          {tab === 'signup' && (
            <p className="text-xs text-gray-400 text-center mt-4">
              By creating an account, you agree that we only access free/busy calendar data — never event details.
            </p>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          {tab === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setTab(tab === 'signin' ? 'signup' : 'signin')}
            className="text-teal-600 font-medium hover:underline"
          >
            {tab === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
