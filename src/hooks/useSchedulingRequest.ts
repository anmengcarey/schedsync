import { useState, useCallback } from 'react'
import { SchedulingRequest, RequestParticipant, SuggestedSlot, MeetingEvent } from '@/types'
import { generateId, generateShareToken } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

const STORAGE_KEY = 'schedsync_requests'
const PARTICIPANTS_KEY = 'schedsync_participants'
const SLOTS_KEY = 'schedsync_slots'
const EVENTS_KEY = 'schedsync_events'

function isDemoMode(): boolean {
  return !import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL === 'https://placeholder.supabase.co'
}

function localGet<T>(key: string): T[] {
  return JSON.parse(localStorage.getItem(key) || '[]')
}

function localSet<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data))
}

export function useSchedulingRequest() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createRequest = useCallback(
    async (data: Omit<SchedulingRequest, 'id' | 'share_token' | 'status' | 'created_at' | 'updated_at'>): Promise<SchedulingRequest | null> => {
      setLoading(true)
      setError(null)
      try {
        const request: SchedulingRequest = {
          ...data,
          id: generateId(),
          share_token: generateShareToken(),
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        if (isDemoMode()) {
          const all = localGet<SchedulingRequest>(STORAGE_KEY)
          localSet(STORAGE_KEY, [...all, request])
        } else {
          const { error } = await supabase.from('scheduling_requests').insert(request)
          if (error) throw error
        }
        return request
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create request')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const getRequest = useCallback(async (id: string): Promise<SchedulingRequest | null> => {
    if (isDemoMode()) {
      const all = localGet<SchedulingRequest>(STORAGE_KEY)
      return all.find((r) => r.id === id) || null
    }
    const { data } = await supabase.from('scheduling_requests').select('*').eq('id', id).single()
    return data
  }, [])

  const getRequestByToken = useCallback(async (token: string): Promise<SchedulingRequest | null> => {
    if (isDemoMode()) {
      const all = localGet<SchedulingRequest>(STORAGE_KEY)
      return all.find((r) => r.share_token === token) || null
    }
    const { data } = await supabase.from('scheduling_requests').select('*').eq('share_token', token).single()
    return data
  }, [])

  const getUserRequests = useCallback(async (userId: string): Promise<SchedulingRequest[]> => {
    if (isDemoMode()) {
      const all = localGet<SchedulingRequest>(STORAGE_KEY)
      const participants = localGet<RequestParticipant>(PARTICIPANTS_KEY)
      const myParticipantRequestIds = participants
        .filter((p) => p.user_id === userId)
        .map((p) => p.request_id)
      return all.filter((r) => r.organizer_id === userId || myParticipantRequestIds.includes(r.id))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
    const { data: ownRequests } = await supabase
      .from('scheduling_requests')
      .select('*')
      .eq('organizer_id', userId)
    const { data: participantRows } = await supabase
      .from('request_participants')
      .select('request_id')
      .eq('user_id', userId)
    const participantRequestIds = (participantRows || []).map((p) => p.request_id)
    let invitedRequests: SchedulingRequest[] = []
    if (participantRequestIds.length > 0) {
      const { data } = await supabase
        .from('scheduling_requests')
        .select('*')
        .in('id', participantRequestIds)
        .neq('organizer_id', userId)
      invitedRequests = data || []
    }
    const all = [...(ownRequests || []), ...invitedRequests]
    return all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [])

  const updateRequestStatus = useCallback(async (id: string, status: SchedulingRequest['status']): Promise<void> => {
    if (isDemoMode()) {
      const all = localGet<SchedulingRequest>(STORAGE_KEY)
      localSet(STORAGE_KEY, all.map((r) => r.id === id ? { ...r, status, updated_at: new Date().toISOString() } : r))
      return
    }
    await supabase.from('scheduling_requests').update({ status }).eq('id', id)
  }, [])

  const addParticipant = useCallback(async (participant: Omit<RequestParticipant, 'id' | 'invited_at'>): Promise<RequestParticipant> => {
    const p: RequestParticipant = {
      ...participant,
      id: generateId(),
      invited_at: new Date().toISOString(),
    }
    if (isDemoMode()) {
      const all = localGet<RequestParticipant>(PARTICIPANTS_KEY)
      localSet(PARTICIPANTS_KEY, [...all, p])
    } else {
      await supabase.from('request_participants').insert(p)
    }
    return p
  }, [])

  const getParticipants = useCallback(async (requestId: string): Promise<RequestParticipant[]> => {
    if (isDemoMode()) {
      return localGet<RequestParticipant>(PARTICIPANTS_KEY).filter((p) => p.request_id === requestId)
    }
    const { data } = await supabase.from('request_participants').select('*').eq('request_id', requestId)
    return data || []
  }, [])

  const updateParticipantStatus = useCallback(async (participantId: string, status: RequestParticipant['status'], userId?: string): Promise<void> => {
    if (isDemoMode()) {
      const all = localGet<RequestParticipant>(PARTICIPANTS_KEY)
      localSet(PARTICIPANTS_KEY, all.map((p) => p.id === participantId ? {
        ...p, status, responded_at: new Date().toISOString(), ...(userId && { user_id: userId })
      } : p))
      return
    }
    const updates: Record<string, unknown> = { status, responded_at: new Date().toISOString() }
    if (userId) updates.user_id = userId
    await supabase.from('request_participants').update(updates).eq('id', participantId)
  }, [])

  const saveSuggestedSlots = useCallback(async (slots: SuggestedSlot[]): Promise<void> => {
    if (isDemoMode()) {
      const all = localGet<SuggestedSlot>(SLOTS_KEY)
      const requestId = slots[0]?.request_id
      const filtered = all.filter((s) => s.request_id !== requestId)
      localSet(SLOTS_KEY, [...filtered, ...slots])
      return
    }
    if (slots.length > 0) {
      await supabase.from('suggested_slots').delete().eq('request_id', slots[0].request_id)
      await supabase.from('suggested_slots').insert(slots)
    }
  }, [])

  const getSuggestedSlots = useCallback(async (requestId: string): Promise<SuggestedSlot[]> => {
    if (isDemoMode()) {
      return localGet<SuggestedSlot>(SLOTS_KEY).filter((s) => s.request_id === requestId).sort((a, b) => a.rank - b.rank)
    }
    const { data } = await supabase.from('suggested_slots').select('*').eq('request_id', requestId).order('rank')
    return data || []
  }, [])

  const createMeetingEvent = useCallback(async (event: Omit<MeetingEvent, 'id' | 'created_at'>): Promise<MeetingEvent> => {
    const e: MeetingEvent = { ...event, id: generateId(), created_at: new Date().toISOString() }
    if (isDemoMode()) {
      const all = localGet<MeetingEvent>(EVENTS_KEY)
      localSet(EVENTS_KEY, [...all, e])
    } else {
      await supabase.from('meeting_events').insert(e)
    }
    return e
  }, [])

  const getMeetingEvent = useCallback(async (requestId: string): Promise<MeetingEvent | null> => {
    if (isDemoMode()) {
      return localGet<MeetingEvent>(EVENTS_KEY).find((e) => e.request_id === requestId) || null
    }
    const { data } = await supabase.from('meeting_events').select('*').eq('request_id', requestId).single()
    return data
  }, [])

  return {
    loading,
    error,
    createRequest,
    getRequest,
    getRequestByToken,
    getUserRequests,
    updateRequestStatus,
    addParticipant,
    getParticipants,
    updateParticipantStatus,
    saveSuggestedSlots,
    getSuggestedSlots,
    createMeetingEvent,
    getMeetingEvent,
  }
}
