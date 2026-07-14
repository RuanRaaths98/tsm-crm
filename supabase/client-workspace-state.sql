create table if not exists public.client_workspace_state (
  client_id uuid primary key references public.clients(id) on delete cascade,
  checklist_items text[] not null default '{}',
  generated_documents jsonb not null default '{}'::jsonb,
  testing_tracker jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.client_workspace_state enable row level security;

drop policy if exists "admin all client workspace state" on public.client_workspace_state;
drop policy if exists "team assigned client workspace state" on public.client_workspace_state;

create policy "admin all client workspace state" on public.client_workspace_state
for all using (public.is_admin())
with check (public.is_admin());

create policy "team assigned client workspace state" on public.client_workspace_state
for all using (
  exists (
    select 1 from public.clients
    where clients.id = client_workspace_state.client_id
      and clients.assigned_to = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.clients
    where clients.id = client_workspace_state.client_id
      and clients.assigned_to = auth.uid()
  )
);
