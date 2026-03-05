export type Provider = 'google' | 'outlook' | 'apple' | 'other';
export type ConnectionStatus = 'connected' | 'disconnected' | 'error';
export type MeetingType = 'one_off' | 'recurring';
export type RequestStatus = 'draft' | 'active' | 'confirmed' | 'expired' | 'cancelled';
export type ParticipantRole = 'organizer' | 'required' | 'optional';
export type ParticipantStatus = 'invited' | 'availability_submitted' | 'declined';
export type AvailabilitySource = 'mock' | 'ics_upload' | 'manual';
export type EventStatus = 'confirmed' | 'cancelled';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  timezone: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarConnection {
  id: string;
  user_id: string;
  provider: Provider;
  status: ConnectionStatus;
  connected_at: string;
}

export interface BusyInterval {
  id: string;
  user_id: string;
  calendar_connection_id?: string;
  source: AvailabilitySource;
  start_time: string;
  end_time: string;
  generated_at: string;
}

export interface ManualAvailability {
  id: string;
  user_id: string;
  request_id: string;
  free_intervals: Array<{ start: string; end: string }>;
  submitted_at: string;
  updated_at: string;
}

export interface SchedulingRequest {
  id: string;
  organizer_id: string;
  title: string;
  duration_minutes: number;
  window_start: string;
  window_end: string;
  meeting_hours_start: string;
  meeting_hours_end: string;
  timezone: string;
  type: MeetingType;
  recurrence_weeks?: number;
  conflict_threshold_k: number;
  status: RequestStatus;
  share_token: string;
  created_at: string;
  updated_at: string;
  organizer?: UserProfile;
  participants?: RequestParticipant[];
}

export interface RequestParticipant {
  id: string;
  request_id: string;
  user_id?: string;
  email: string;
  name?: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  invited_at: string;
  responded_at?: string;
  user?: UserProfile;
}

export interface SuggestedSlot {
  id: string;
  request_id: string;
  start_time: string;
  end_time: string;
  conflict_count: number;
  conflicted_participant_ids: string[];
  score: number;
  is_near_miss: boolean;
  rank: number;
  week_viability?: Record<string, boolean>;
  created_at: string;
  conflicted_names?: string[];
  viability_label?: string;
}

export interface MeetingEvent {
  id: string;
  request_id: string;
  slot_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  timezone: string;
  recurrence_rule?: string;
  status: EventStatus;
  created_at: string;
}

export interface ProviderInfo {
  id: Provider;
  name: string;
  description: string;
  color: string;
  bgColor: string;
  icon: string;
}
