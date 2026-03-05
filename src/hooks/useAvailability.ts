import { useState, useCallback } from 'react'
import { BusyInterval, CalendarConnection, ManualAvailability, Provider } from '@/types'
import { generateMockBusyIntervals } from '@/lib/mockDataGenerator'
import { generateId } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

const CONNECTIONS_KEY = 'schedsync_connections'
const BUSY_KEY = 'schedsync_busy_intervals'
const MANUAL_KEY = 'schedsync_manual_availability'

function isDemoMode(): boolean {
  return !import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL === 'https://placeholder.supabase.co'
}

function localGet<T>(key: string): T[] {
  return JSON.parse(localStorage.getItem(key) || '[]')
}
function localSet<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data))
}

export function useAvailability() {
  const [loading, setLoading] = useState(false)

  const connectCalendar = useCallback(
    async (userId: string, provider: Provider, windowStart: string, windowEnd: string): Promise<CalendarConnection> => {
      setLoading(true)
      // Simulate a 1.5s "connecting" delay
      await new Promise((r) => setTimeout(r, 1500))

      const connection: CalendarConnection = {
        id: generateId(),
        user_id: userId,
        provider,
        status: 'connected',
        connected_at: new Date().toISOString(),
      }

      // Generate mock busy intervals for this connection
      const intervals = generateMockBusyIntervals(userId, windowStart, windowEnd, connection.id)

      if (isDemoMode()) {
        const allConnections = localGet<CalendarConnection>(CONNECTIONS_KEY)
        // Find and replace existing connection for same provider, clearing its intervals
        const existingConn = allConnections.find((c) => c.user_id === userId && c.provider === provider)
        const filtered = allConnections.filter((c) => !(c.user_id === userId && c.provider === provider))
        localSet(CONNECTIONS_KEY, [...filtered, connection])

        const allIntervals = localGet<BusyInterval>(BUSY_KEY)
        // Clear intervals only for this specific connection (not other providers)
        const keptIntervals = allIntervals.filter(
          (i) => !(i.user_id === userId && i.calendar_connection_id === existingConn?.id)
        )
        localSet(BUSY_KEY, [...keptIntervals, ...intervals])
      } else {
        await supabase.from('calendar_connections').upsert(connection)
        await supabase.from('busy_intervals').delete().match({ user_id: userId, source: 'mock' })
        await supabase.from('busy_intervals').insert(intervals)
      }

      setLoading(false)
      return connection
    },
    []
  )

  const disconnectCalendar = useCallback(async (userId: string, provider: Provider): Promise<void> => {
    if (isDemoMode()) {
      const all = localGet<CalendarConnection>(CONNECTIONS_KEY)
      const conn = all.find((c) => c.user_id === userId && c.provider === provider)
      localSet(CONNECTIONS_KEY, all.filter((c) => !(c.user_id === userId && c.provider === provider)))
      const intervals = localGet<BusyInterval>(BUSY_KEY)
      // Only clear intervals for this specific connection, not other providers
      localSet(BUSY_KEY, intervals.filter((i) => !(i.user_id === userId && i.calendar_connection_id === conn?.id)))
      return
    }
    await supabase.from('calendar_connections').delete().match({ user_id: userId, provider })
  }, [])

  const getConnections = useCallback(async (userId: string): Promise<CalendarConnection[]> => {
    if (isDemoMode()) {
      return localGet<CalendarConnection>(CONNECTIONS_KEY).filter((c) => c.user_id === userId)
    }
    const { data } = await supabase.from('calendar_connections').select('*').eq('user_id', userId)
    return data || []
  }, [])

  const getUserBusyIntervals = useCallback(async (userId: string): Promise<BusyInterval[]> => {
    if (isDemoMode()) {
      return localGet<BusyInterval>(BUSY_KEY).filter((i) => i.user_id === userId)
    }
    const { data } = await supabase.from('busy_intervals').select('*').eq('user_id', userId)
    return data || []
  }, [])

  const getAllBusyIntervalsForRequest = useCallback(
    async (userIds: string[]): Promise<BusyInterval[]> => {
      if (isDemoMode()) {
        return localGet<BusyInterval>(BUSY_KEY).filter((i) => userIds.includes(i.user_id))
      }
      const { data } = await supabase.from('busy_intervals').select('*').in('user_id', userIds)
      return data || []
    },
    []
  )

  const saveManualAvailability = useCallback(
    async (userId: string, requestId: string, freeIntervals: Array<{ start: string; end: string }>): Promise<void> => {
      const record: ManualAvailability = {
        id: generateId(),
        user_id: userId,
        request_id: requestId,
        free_intervals: freeIntervals,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Convert free intervals to busy intervals (inverse) for overlap engine
      // For simplicity in demo, we store free intervals and infer busy
      if (isDemoMode()) {
        const all = localGet<ManualAvailability>(MANUAL_KEY)
        const filtered = all.filter((m) => !(m.user_id === userId && m.request_id === requestId))
        localSet(MANUAL_KEY, [...filtered, record])

        // Also store as busy intervals (everything that is NOT free)
        const allIntervals = localGet<BusyInterval>(BUSY_KEY)
        const keptIntervals = allIntervals.filter((i) => !(i.user_id === userId && i.source === 'manual'))
        // For demo: free intervals are stored directly; overlap engine handles them separately
        localSet(BUSY_KEY, keptIntervals)
        localStorage.setItem(`schedsync_manual_${userId}_${requestId}`, JSON.stringify(freeIntervals))
      } else {
        await supabase.from('manual_availability').upsert(record)
      }
    },
    []
  )

  const getManualAvailability = useCallback(async (userId: string, requestId: string): Promise<Array<{ start: string; end: string }> | null> => {
    if (isDemoMode()) {
      const stored = localStorage.getItem(`schedsync_manual_${userId}_${requestId}`)
      return stored ? JSON.parse(stored) : null
    }
    const { data } = await supabase
      .from('manual_availability')
      .select('*')
      .match({ user_id: userId, request_id: requestId })
      .single()
    return data?.free_intervals || null
  }, [])

  return {
    loading,
    connectCalendar,
    disconnectCalendar,
    getConnections,
    getUserBusyIntervals,
    getAllBusyIntervalsForRequest,
    saveManualAvailability,
    getManualAvailability,
  }
}
