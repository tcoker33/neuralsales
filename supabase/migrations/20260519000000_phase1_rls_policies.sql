-- Phase 1 foundation: RLS policies so app actions run under the user JWT.
-- Service role is reserved for webhooks, provider callbacks, scheduled
-- jobs, and system-owned operations -- it bypasses RLS by design.

-- workspace_members: a user can see their own membership rows.
create policy "workspace_members_select_own"
  on public.workspace_members
  for select
  to authenticated
  using (user_id = auth.uid());

-- workspaces: a user can see workspaces they are a member of.
create policy "workspaces_select_member"
  on public.workspaces
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_members m
      where m.workspace_id = workspaces.id
        and m.user_id = auth.uid()
    )
  );

-- agents: a user can see agents in workspaces they are a member of.
create policy "agents_select_member"
  on public.agents
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_members m
      where m.workspace_id = agents.workspace_id
        and m.user_id = auth.uid()
    )
  );

-- leads: a user can select and update leads in their workspaces.
create policy "leads_select_member"
  on public.leads
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_members m
      where m.workspace_id = leads.workspace_id
        and m.user_id = auth.uid()
    )
  );

create policy "leads_update_member"
  on public.leads
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_members m
      where m.workspace_id = leads.workspace_id
        and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.workspace_members m
      where m.workspace_id = leads.workspace_id
        and m.user_id = auth.uid()
    )
  );
