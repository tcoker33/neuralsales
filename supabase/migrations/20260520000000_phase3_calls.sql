-- Phase 3 Deliverable B: calls + call_events + call_transcripts.
-- Also extends leads with ai_summary populated by the post-call summarizer.

alter table public.leads
  add column if not exists ai_summary text;

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  status text not null default 'pending',
  started_at timestamptz,
  ended_at timestamptz,
  summary text,
  sentiment text,
  outcome text,
  external_crm_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calls_workspace_id_idx
  on public.calls (workspace_id);
create index if not exists calls_lead_id_idx
  on public.calls (lead_id);
create index if not exists calls_agent_id_idx
  on public.calls (agent_id);
create index if not exists calls_workspace_status_idx
  on public.calls (workspace_id, status);

create table if not exists public.call_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  call_id uuid not null references public.calls(id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  sequence integer not null,
  created_at timestamptz not null default now(),
  unique (call_id, sequence)
);

create index if not exists call_events_call_id_idx
  on public.call_events (call_id);
create index if not exists call_events_workspace_id_idx
  on public.call_events (workspace_id);

create table if not exists public.call_transcripts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  call_id uuid not null references public.calls(id) on delete cascade,
  speaker text not null,
  content text not null,
  sequence integer not null,
  created_at timestamptz not null default now(),
  unique (call_id, sequence)
);

create index if not exists call_transcripts_call_id_idx
  on public.call_transcripts (call_id);
create index if not exists call_transcripts_workspace_id_idx
  on public.call_transcripts (workspace_id);

alter table public.calls enable row level security;
alter table public.call_events enable row level security;
alter table public.call_transcripts enable row level security;

-- RLS policies: workspace members can read; the orchestrating action
-- (running under user JWT) can insert/update within its own workspace.

create policy "calls_select_member"
  on public.calls
  for select
  to authenticated
  using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = calls.workspace_id
        and m.user_id = auth.uid()
    )
  );

create policy "calls_insert_member"
  on public.calls
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = calls.workspace_id
        and m.user_id = auth.uid()
    )
  );

create policy "calls_update_member"
  on public.calls
  for update
  to authenticated
  using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = calls.workspace_id
        and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = calls.workspace_id
        and m.user_id = auth.uid()
    )
  );

create policy "call_events_select_member"
  on public.call_events
  for select
  to authenticated
  using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = call_events.workspace_id
        and m.user_id = auth.uid()
    )
  );

create policy "call_events_insert_member"
  on public.call_events
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = call_events.workspace_id
        and m.user_id = auth.uid()
    )
  );

create policy "call_transcripts_select_member"
  on public.call_transcripts
  for select
  to authenticated
  using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = call_transcripts.workspace_id
        and m.user_id = auth.uid()
    )
  );

create policy "call_transcripts_insert_member"
  on public.call_transcripts
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = call_transcripts.workspace_id
        and m.user_id = auth.uid()
    )
  );
