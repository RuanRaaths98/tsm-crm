# TSM CRM

A production-ready MVP CRM branded for TSM. It includes a premium dashboard, lead management, pipeline view, client profiles, task triage, admin settings, Supabase schema, and a Formspree webhook endpoint.

## Features

- Role-aware agency CRM foundation for Admin and Team Member access.
- Dashboard metrics for leads, hot leads, follow-ups, clients, won/lost deals, and pipeline value.
- Lead table with search, status/source/temperature/assignee filters, quick add, delete, status changes, and lead-to-client conversion.
- Kanban-style pipeline across New, Contacted, Qualified, Proposal Sent, Won, and Lost.
- Client management with service tags, retainer values, linked original leads, notes, and ownership.
- Task views for overdue, due today, and upcoming work.
- Activity timeline and settings sections with team users, services, lead sources, pipeline statuses, and webhook instructions.
- `POST /api/webhooks/formspree` endpoint that validates submissions, prevents duplicate leads by email or phone, updates duplicates, and records activities.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase
- Zod
- React Hook Form ready

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Supabase Setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `FORMSPREE_WEBHOOK_SECRET`
3. Run `supabase/schema.sql` in the Supabase SQL editor.
4. Create users in Supabase Auth, then add matching rows in `profiles`.

The schema includes profiles, leads, clients, tasks, notes, activities, services, and lead sources with row-level security policies for Admin and assigned Team Member access.

## Formspree Setup

See `FORMSPREE-SETUP.md`.

Webhook URL:

```text
https://your-domain.com/api/webhooks/formspree
```

Required header:

```text
x-webhook-secret: your FORMSPREE_WEBHOOK_SECRET value
```

## Checks

```bash
npm run lint
npm run build
```
