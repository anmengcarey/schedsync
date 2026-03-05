# SchedSync — Privacy-First Group Scheduling

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Install shadcn/ui components
```bash
npx shadcn@latest init
npx shadcn@latest add button input label card badge dialog textarea select tabs avatar progress separator alert switch checkbox toast
```

### 3. Set up environment
```bash
cp .env.example .env
```
Fill in your Supabase project URL and anon key. If left blank, the app runs in **demo mode** using localStorage — fully functional without any backend.

### 4. Set up Supabase (optional — skip for demo mode)
- Create a project at supabase.com
- Run `supabase/schema.sql` in the SQL editor
- Copy the project URL and anon key to `.env`

### 5. Run
```bash
npm run dev
```

---

## Demo Mode
When Supabase env vars are not set, the app runs entirely in localStorage. All data is stored in the browser — perfect for demos and presentations.

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Email**: Resend (post-MVP)
- **Hosting**: Lovable / Vercel

## Project Structure
```
src/
  types/        — TypeScript types
  lib/          — Core utilities (overlap engine, mock data, ICS generator)
  contexts/     — Auth context
  hooks/        — Data hooks (scheduling requests, availability)
  components/   — Reusable UI components
  pages/        — Route-level page components
supabase/
  schema.sql    — Database schema + RLS policies
```

## Milestones
- **M1** ✅ Core scheduling flow (all calendar providers in demo UI)
- **M2** ✅ Availability map + near-miss
- **M3** ✅ Manual availability grid
- **M4** ✅ Recurring scheduling
- **M5** 🔜 Email notifications + polish

## Calendar Integration (Demo)
Calendar connections are **simulated** in this MVP. When a user connects Google, Outlook, Apple, or another calendar:
- A realistic mock free/busy schedule is generated for that user
- Apple Calendar also supports `.ics` file upload for real data
- No real OAuth or API calls are made

Real API integration (Google Calendar API, Microsoft Graph, Apple CalDAV) is planned for post-MVP.
