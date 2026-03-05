-- SchedSync MVP Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =====================
-- TABLES
-- =====================

create table if not exists public.users (
  id           uuid primary key default uuid_generate_v4(),
  email        text unique not null,
  name         text not null,
  timezone     text not null default 'America/New_York',
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.calendar_connections (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.users(id) on delete cascade,
  provider     text not null check (provider in ('google', 'outlook', 'apple', 'other')),
  status       text not null default 'connected' check (status in ('connected', 'disconnected', 'error')),
  connected_at timestamptz not null default now(),
  unique (user_id, provider)
);

create table if not exists public.busy_intervals (
  id                      uuid primary key default uuid_generate_v4(),
  user_id                 uuid not null references public.users(id) on delete cascade,
  calendar_connection_id  uuid references public.calendar_connections(id) on delete set null,
  source                  text not null check (source in ('mock', 'ics_upload', 'manual')),
  start_time              timestamptz not null,
  end_time                timestamptz not null,
  generated_at            timestamptz not null default now()
);

create index if not exists busy_intervals_user_id_idx on public.busy_intervals(user_id);
create index if not exists busy_intervals_time_idx on public.busy_intervals(start_time, end_time);

create table if not exists public.manual_availability (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references public.users(id) on delete cascade,
  request_id     uuid not null,
  free_intervals jsonb not null default '[]',
  submitted_at   timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, request_id)
);

create table if not exists public.scheduling_requests (
  id                   uuid primary key default uuid_generate_v4(),
  organizer_id         uuid not null references public.users(id) on delete cascade,
  title                text not null default 'Team Meeting',
  duration_minutes     integer not null default 60,
  window_start         date not null,
  window_end           date not null,
  meeting_hours_start  time not null default '09:00',
  meeting_hours_end    time not null default '18:00',
  timezone             text not null,
  type                 text not null check (type in ('one_off', 'recurring')),
  recurrence_weeks     integer,
  conflict_threshold_k integer not null default 1,
  status               text not null default 'active'
                         check (status in ('draft', 'active', 'confirmed', 'expired', 'cancelled')),
  share_token          text unique not null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists scheduling_requests_organizer_idx on public.scheduling_requests(organizer_id);
create index if not exists scheduling_requests_share_token_idx on public.scheduling_requests(share_token);

create table if not exists public.request_participants (
  id           uuid primary key default uuid_generate_v4(),
  request_id   uuid not null references public.scheduling_requests(id) on delete cascade,
  user_id      uuid references public.users(id) on delete set null,
  email        text not null,
  name         text,
  role         text not null check (role in ('organizer', 'required', 'optional')),
  status       text not null default 'invited'
                 check (status in ('invited', 'availability_submitted', 'declined')),
  invited_at   timestamptz not null default now(),
  responded_at timestamptz
);

create index if not exists request_participants_request_id_idx on public.request_participants(request_id);
create index if not exists request_participants_user_id_idx on public.request_participants(user_id);

create table if not exists public.suggested_slots (
  id                          uuid primary key default uuid_generate_v4(),
  request_id                  uuid not null references public.scheduling_requests(id) on delete cascade,
  start_time                  timestamptz not null,
  end_time                    timestamptz not null,
  conflict_count              integer not null default 0,
  conflicted_participant_ids  uuid[] not null default '{}',
  score                       float not null default 0,
  is_near_miss                boolean not null default false,
  rank                        integer not null,
  week_viability              jsonb,
  created_at                  timestamptz not null default now()
);

create index if not exists suggested_slots_request_idx on public.suggested_slots(request_id);

create table if not exists public.meeting_events (
  id               uuid primary key default uuid_generate_v4(),
  request_id       uuid not null references public.scheduling_requests(id) on delete cascade,
  slot_id          uuid references public.suggested_slots(id) on delete set null,
  title            text not null,
  description      text,
  start_time       timestamptz not null,
  end_time         timestamptz not null,
  timezone         text not null,
  recurrence_rule  text,
  status           text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at       timestamptz not null default now()
);

-- =====================
-- ROW LEVEL SECURITY
-- =====================

alter table public.users enable row level security;
alter table public.calendar_connections enable row level security;
alter table public.busy_intervals enable row level security;
alter table public.manual_availability enable row level security;
alter table public.scheduling_requests enable row level security;
alter table public.request_participants enable row level security;
alter table public.suggested_slots enable row level security;
alter table public.meeting_events enable row level security;

-- Users: read/write own row
create policy "Users: own row" on public.users
  for all using (auth.uid() = id);

-- Calendar connections: own only
create policy "Calendar connections: own" on public.calendar_connections
  for all using (auth.uid() = user_id);

-- Busy intervals: own only
create policy "Busy intervals: own" on public.busy_intervals
  for all using (auth.uid() = user_id);

-- Scheduling requests: organizer full access; participants read
create policy "Requests: organizer" on public.scheduling_requests
  for all using (auth.uid() = organizer_id);

create policy "Requests: participant read" on public.scheduling_requests
  for select using (
    exists (
      select 1 from public.request_participants p
      where p.request_id = id and p.user_id = auth.uid()
    )
  );

-- Public invite link access (unauthenticated read by share_token handled in app)
create policy "Requests: public share token read" on public.scheduling_requests
  for select using (true);

-- Request participants: organizer or self
create policy "Participants: organizer" on public.request_participants
  for all using (
    exists (
      select 1 from public.scheduling_requests r
      where r.id = request_id and r.organizer_id = auth.uid()
    )
  );

create policy "Participants: own" on public.request_participants
  for all using (auth.uid() = user_id);

-- Suggested slots: anyone with request access
create policy "Slots: request access" on public.suggested_slots
  for all using (
    exists (
      select 1 from public.scheduling_requests r
      where r.id = request_id
        and (r.organizer_id = auth.uid() or exists (
          select 1 from public.request_participants p
          where p.request_id = request_id and p.user_id = auth.uid()
        ))
    )
  );

-- Meeting events: same as slots
create policy "Events: request access" on public.meeting_events
  for all using (
    exists (
      select 1 from public.scheduling_requests r
      where r.id = request_id
        and (r.organizer_id = auth.uid() or exists (
          select 1 from public.request_participants p
          where p.request_id = request_id and p.user_id = auth.uid()
        ))
    )
  );

-- Manual availability: own or organizer
create policy "Manual availability: own" on public.manual_availability
  for all using (auth.uid() = user_id);

-- =====================
-- UPDATED_AT TRIGGERS
-- =====================

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_updated_at before update on public.users
  for each row execute procedure public.handle_updated_at();

create trigger requests_updated_at before update on public.scheduling_requests
  for each row execute procedure public.handle_updated_at();
