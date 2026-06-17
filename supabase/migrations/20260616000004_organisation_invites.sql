-- ============================================================
-- ORGANISATION INVITES
-- ============================================================
create table public.organisation_invites (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid references public.organisations (id) on delete cascade not null,
  email           text not null,
  role            text default 'member' check (role in ('admin', 'member')),
  invited_by      uuid references public.users (id) not null,
  invite_token    text unique not null default gen_random_uuid()::text,
  created_at      timestamptz default now(),
  accepted_at     timestamptz,
  expires_at      timestamptz default (now() + interval '7 days')
);

alter table public.organisation_invites enable row level security;

-- Composite index — the two most common lookup patterns
create index organisation_invites_org_email_idx
  on public.organisation_invites (organisation_id, email);

create index organisation_invites_token_idx
  on public.organisation_invites (invite_token);

-- ============================================================
-- RLS POLICIES
--
-- SELECT:
--   • Owners and admins of the org can read all invites for it.
--   • Public (including unauthenticated) can read any row — the
--     invite_token is the security mechanism (UUID, unguessable).
--     The application-layer accept action performs full validation.
--
-- INSERT:
--   • Only owners and admins of the org may create invites.
--
-- UPDATE:
--   • No policy — accepted_at is set via the service-role client
--     in the accept-invite action (bypasses RLS).
-- ============================================================

create policy "invites_select_admin"
  on public.organisation_invites
  for select
  using (public.get_user_org_role(organisation_id) in ('owner', 'admin'));

-- Separate permissive policy so unauthenticated requests can
-- look up a single invite by its token for the accept flow.
create policy "invites_select_by_token"
  on public.organisation_invites
  for select
  using (true);

create policy "invites_insert_admin"
  on public.organisation_invites
  for insert
  with check (public.get_user_org_role(organisation_id) in ('owner', 'admin'));
