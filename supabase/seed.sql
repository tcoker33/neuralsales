-- Local development seed for the persisted call path.
--
-- Runs automatically on `supabase db reset`. Inserts one workspace,
-- one agent, and one lead with fixed UUIDs so the dashboard and the
-- calls flow have something to point at.
--
-- NOTE: workspace_members.user_id references auth.users(id), which is
-- created by the auth flow (sign-up), not by this seed. After you sign
-- up a user in local Supabase Studio, grab its uid and run the membership
-- insert at the bottom of this file (uncomment + paste the uid). Without
-- that row, RLS will (correctly) hide everything from the signed-in user.

-- Deterministic IDs so they're easy to reference in the URL / actions.
--   workspace : 00000000-0000-0000-0000-0000000000w1
--   agent     : 00000000-0000-0000-0000-0000000000a1
--   lead      : 00000000-0000-0000-0000-0000000000L1
insert into public.workspaces (id, name)
values ('00000000-0000-0000-0000-0000000000a0', 'Demo Workspace')
on conflict (id) do nothing;

insert into public.agents (id, workspace_id, display_name, email, is_active)
values (
  '00000000-0000-0000-0000-0000000000a1',
  '00000000-0000-0000-0000-0000000000a0',
  'Alex (Demo Agent)',
  'alex@demo.test',
  true
)
on conflict (id) do nothing;

insert into public.leads (id, workspace_id, status, first_name, last_name, email, phone)
values (
  '00000000-0000-0000-0000-0000000000b1',
  '00000000-0000-0000-0000-0000000000a0',
  'new',
  'Jordan',
  'Rivera',
  'jordan.rivera@demo.test',
  '+15555550123'
)
on conflict (id) do nothing;

-- Membership: required for RLS to expose the above to a signed-in user.
-- Replace <YOUR_AUTH_UID> with the uid from auth.users after sign-up, then
-- uncomment:
--
-- insert into public.workspace_members (workspace_id, user_id, role)
-- values (
--   '00000000-0000-0000-0000-0000000000a0',
--   '<YOUR_AUTH_UID>',
--   'owner'
-- )
-- on conflict (workspace_id, user_id) do nothing;
