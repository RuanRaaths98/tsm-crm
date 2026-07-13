create extension if not exists "pgcrypto";

create type public.user_role as enum ('Admin', 'Team Member');
create type public.lead_status as enum ('New', 'Contacted', 'Qualified', 'Proposal Sent', 'Won', 'Lost');
create type public.lead_temperature as enum ('Cold', 'Warm', 'Hot');
create type public.client_status as enum ('Active', 'Paused', 'Cancelled');
create type public.task_status as enum ('To Do', 'In Progress', 'Done');
create type public.task_priority as enum ('Low', 'Medium', 'High');
create type public.entity_type as enum ('lead', 'client');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role public.user_role not null default 'Team Member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.lead_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  company_name text,
  source text not null default 'Manual',
  service_interested text,
  budget numeric(12, 2) not null default 0,
  message text,
  status public.lead_status not null default 'New',
  temperature public.lead_temperature not null default 'Warm',
  assigned_to uuid references public.profiles(id) on delete set null,
  next_follow_up_date date,
  internal_notes text,
  raw_submission jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_email_or_phone check (email is not null or phone is not null)
);

create unique index leads_unique_email on public.leads (lower(email)) where email is not null;
create unique index leads_unique_phone on public.leads (phone) where phone is not null;
create index leads_status_idx on public.leads (status);
create index leads_assigned_to_idx on public.leads (assigned_to);
create index leads_followup_idx on public.leads (next_follow_up_date);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  contact_person text,
  email text,
  phone text,
  company text,
  website text,
  services text[] not null default '{}',
  monthly_retainer_value numeric(12, 2) not null default 0,
  start_date date,
  status public.client_status not null default 'Active',
  notes text,
  original_lead_id uuid references public.leads(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  due_date date not null,
  priority public.task_priority not null default 'Medium',
  status public.task_status not null default 'To Do',
  assigned_user uuid references public.profiles(id) on delete set null,
  related_type public.entity_type not null,
  related_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  entity_type public.entity_type not null,
  entity_id uuid not null,
  author_id uuid references public.profiles(id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  entity_type public.entity_type not null,
  entity_id uuid not null,
  type text not null,
  message text not null,
  actor text not null default 'System',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.clients enable row level security;
alter table public.tasks enable row level security;
alter table public.notes enable row level security;
alter table public.activities enable row level security;
alter table public.services enable row level security;
alter table public.lead_sources enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'Admin'
  );
$$;

create policy "profiles self or admin" on public.profiles
for all using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy "admin all leads" on public.leads
for all using (public.is_admin())
with check (public.is_admin());

create policy "team assigned leads" on public.leads
for all using (assigned_to = auth.uid())
with check (assigned_to = auth.uid());

create policy "admin all clients" on public.clients
for all using (public.is_admin())
with check (public.is_admin());

create policy "team assigned clients" on public.clients
for all using (assigned_to = auth.uid())
with check (assigned_to = auth.uid());

create policy "admin all tasks" on public.tasks
for all using (public.is_admin())
with check (public.is_admin());

create policy "team assigned tasks" on public.tasks
for all using (assigned_user = auth.uid())
with check (assigned_user = auth.uid());

create policy "team notes visible through app" on public.notes
for all using (public.is_admin() or author_id = auth.uid())
with check (public.is_admin() or author_id = auth.uid());

create policy "team activities visible" on public.activities
for select using (public.is_admin() or true);

create policy "settings admin write" on public.services
for all using (public.is_admin())
with check (public.is_admin());

create policy "settings everyone read services" on public.services
for select using (auth.role() = 'authenticated');

create policy "settings admin write sources" on public.lead_sources
for all using (public.is_admin())
with check (public.is_admin());

create policy "settings everyone read sources" on public.lead_sources
for select using (auth.role() = 'authenticated');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('client-slas', 'client-slas', false, 10485760, array['application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "authenticated manage client slas" on storage.objects;

create policy "authenticated manage client slas" on storage.objects
for all
to authenticated
using (bucket_id = 'client-slas')
with check (bucket_id = 'client-slas');

insert into public.services (name) values
  ('Full Package'),
  ('Paid Media Management'),
  ('AI Sales Automation'),
  ('CRM Implementation'),
  ('Landing Page Build'),
  ('Email Nurture System'),
  ('Analytics Dashboard')
on conflict do nothing;

insert into public.lead_sources (name) values
  ('Formspree'),
  ('Google Ads'),
  ('LinkedIn'),
  ('Referral'),
  ('Website'),
  ('Cold Email')
on conflict do nothing;
