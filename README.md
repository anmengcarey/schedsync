# SchedSync — Privacy-First Group Scheduling

Schedule group meetings without sharing your calendar details. Connect any calendar, invite your team, and get the best meeting time instantly — without exposing a single event name.

**Live demo**: [schedsync-seven.vercel.app](https://schedsync-seven.vercel.app)

---

## Features

- **Privacy-first availability** — shares only free/busy blocks, never event titles or details
- **Multi-calendar support** — Google, Outlook, Apple, or any provider (simulated in MVP)
- **Smart overlap engine** — finds best meeting times with configurable conflict tolerance (≤0 / ≤1 / ≤2 conflicts)
- **Recurring scheduling** — finds a weekly slot that works across multiple weeks
- **Manual availability** — participants can fill a grid instead of connecting a calendar
- **My Calendar view** — weekly grid showing your own free/busy blocks, color-coded by provider
- **Cross-browser invite links** — invite link works even without a shared backend
- **ICS export** — download `.ics` or copy invite text after confirming a time
- **Demo mode** — runs entirely in localStorage with no backend required

---

## How It Works

1. **Organizer creates a request** — sets meeting title, duration, date window, acceptable hours, and flexibility (how many conflicts are OK)
2. **Organizer shares an invite link** — copies the link from the Dashboard and sends it to participants via any channel (Slack, email, WeChat, etc.). No automated email is sent by the app.
3. **Participants connect their calendar** — each participant opens the link, signs up, and connects their calendar (mock data in MVP). Their free/busy data is submitted and stored.
4. **Availability is merged in real time** — the organizer visits the Results page to see suggested time slots ranked by overlap. All participants' free/busy data is merged automatically.
5. **Organizer confirms a slot** — picks the best time, confirms it, and downloads an `.ics` invite to share with the team.

---

## Quick Start

### Run in demo mode (no backend needed)
```bash
npm install
npm run dev
```
All data is stored in localStorage. Fully functional for local demos.

### Run with Supabase (real multi-user sync)
```bash
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

---

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL Editor
3. Go to **Authentication → Providers → Email** to configure email confirmation
4. (Optional) Set up Resend SMTP under **Authentication → Emails → SMTP Settings** for reliable email delivery
5. Copy the project URL and anon key to `.env`
6. Add your deployed domain to **Authentication → URL Configuration → Redirect URLs**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| UI | shadcn/ui + Tailwind CSS |
| Auth & DB | Supabase (PostgreSQL + Auth) |
| Email | Resend (SMTP for auth confirmation emails) |
| Hosting | Vercel (auto-deploy from GitHub) |

---

## Project Structure

```
src/
  types/           TypeScript interfaces
  lib/             Overlap engine, mock data generator, ICS generator, utils
  contexts/        Auth context (demo + Supabase modes)
  hooks/           useSchedulingRequest, useAvailability
  components/      UI components (MyCalendarView, AvailabilityMap, SlotCard, …)
  pages/           Route-level pages
supabase/
  schema.sql       Database schema (8 tables)
vercel.json        SPA routing config
```

### Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/auth` | Sign in / create account |
| `/auth/confirmed` | Email confirmation success |
| `/onboarding` | Connect calendar after signup |
| `/dashboard` | Requests list + My Calendar tab |
| `/create` | New scheduling request form |
| `/invite/:token` | Participant invite page |
| `/invite/:token/manual` | Manual availability grid |
| `/request/:id/results` | Suggested slots + availability map |
| `/request/:id/confirm` | Confirm a time slot |
| `/request/:id/success` | Confirmed meeting + ICS download |
| `/settings` | Profile + calendar connections + timezone |

---

## Demo Mode vs Supabase Mode

| | Demo mode | Supabase mode |
|--|-----------|---------------|
| Data storage | localStorage (per browser) | PostgreSQL (shared) |
| Multi-user sync | ❌ | ✅ |
| Invite links | ✅ (request encoded in URL) | ✅ |
| Auth | localStorage mock | Supabase Auth + email confirmation |
| Setup required | None | Supabase project + env vars |

---

## Calendar Integration (MVP)

Calendar connections are **simulated** — no real OAuth or API calls are made. When a user connects a calendar:

- A realistic mock free/busy schedule is generated (deterministic per user + provider)
- Event names are provider-specific: Outlook → courses, Google → coffee chats, Apple → activities
- Colors are stable across sessions: Google = green, Outlook = blue, Apple = gray, Other = purple

Real API integration (Google Calendar API, Microsoft Graph, Apple CalDAV) is planned post-MVP.

---

## Milestones

- **M1** ✅ Core scheduling flow (connect calendar → invite → suggest slots → confirm)
- **M2** ✅ Availability map + near-miss conflict display
- **M3** ✅ Manual availability grid
- **M4** ✅ Recurring scheduling (weekly slot finder)
- **M5** ✅ My Calendar view, Supabase multi-user sync, email confirmation flow
- **M6** 🔜 Real calendar OAuth (Google Calendar API, Microsoft Graph, Apple CalDAV)
