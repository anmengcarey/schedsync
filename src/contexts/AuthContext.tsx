import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/types'
import { getBrowserTimezone, generateId } from '@/lib/utils'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Demo mode: local storage fallback when Supabase is not configured
const DEMO_USER_KEY = 'schedsync_demo_user'
const DEMO_PROFILE_KEY = 'schedsync_demo_profile'

function isDemoMode(): boolean {
  return !import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL === 'https://placeholder.supabase.co'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemoMode()) {
      // Load from localStorage in demo mode
      const storedUser = localStorage.getItem(DEMO_USER_KEY)
      const storedProfile = localStorage.getItem(DEMO_PROFILE_KEY)
      if (storedUser) setUser(JSON.parse(storedUser))
      if (storedProfile) setProfile(JSON.parse(storedProfile))
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from('users').select('*').eq('id', userId).single()
    if (data) setProfile(data)
  }

  async function signUp(email: string, password: string, name: string): Promise<{ error: Error | null }> {
    if (isDemoMode()) {
      const newUser = { id: generateId(), email, app_metadata: {}, user_metadata: { name }, aud: 'authenticated', created_at: new Date().toISOString() } as unknown as User
      const newProfile: UserProfile = {
        id: newUser.id,
        email,
        name,
        timezone: getBrowserTimezone(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(newUser))
      localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(newProfile))
      // Store in all-users list for invite lookups
      const allUsers = JSON.parse(localStorage.getItem('schedsync_all_users') || '[]')
      allUsers.push(newProfile)
      localStorage.setItem('schedsync_all_users', JSON.stringify(allUsers))
      setUser(newUser)
      setProfile(newProfile)
      return { error: null }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + '/auth/confirmed' },
    })
    if (error) return { error: new Error(error.message) }

    if (data.user) {
      const newProfile: UserProfile = {
        id: data.user.id,
        email,
        name,
        timezone: getBrowserTimezone(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      await supabase.from('users').insert(newProfile)
      setProfile(newProfile)
    }
    return { error: null }
  }

  async function signIn(email: string, password: string): Promise<{ error: Error | null }> {
    if (isDemoMode()) {
      const storedProfile = localStorage.getItem(DEMO_PROFILE_KEY)
      if (storedProfile) {
        const p = JSON.parse(storedProfile) as UserProfile
        if (p.email === email) {
          const storedUser = localStorage.getItem(DEMO_USER_KEY)
          if (storedUser) setUser(JSON.parse(storedUser))
          setProfile(p)
          return { error: null }
        }
      }
      // Check all users
      const allUsers: UserProfile[] = JSON.parse(localStorage.getItem('schedsync_all_users') || '[]')
      const found = allUsers.find((u) => u.email === email)
      if (found) {
        const mockUser = { id: found.id, email: found.email, app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: found.created_at } as unknown as User
        localStorage.setItem(DEMO_USER_KEY, JSON.stringify(mockUser))
        localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(found))
        setUser(mockUser)
        setProfile(found)
        return { error: null }
      }
      return { error: new Error('No account found. Please sign up first.') }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: new Error(error.message) }
    return { error: null }
  }

  async function signOut(): Promise<void> {
    if (isDemoMode()) {
      localStorage.removeItem(DEMO_USER_KEY)
      localStorage.removeItem(DEMO_PROFILE_KEY)
      setUser(null)
      setProfile(null)
      return
    }
    await supabase.auth.signOut()
  }

  async function updateProfile(updates: Partial<UserProfile>): Promise<void> {
    if (!profile) return
    const updated = { ...profile, ...updates, updated_at: new Date().toISOString() }
    if (isDemoMode()) {
      localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(updated))
      setProfile(updated)
      return
    }
    await supabase.from('users').update(updates).eq('id', profile.id)
    setProfile(updated)
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signUp, signIn, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
