-- ============================================================
-- ORGANISATIONS
-- ============================================================
create table public.organisations (
  id                          uuid primary key default gen_random_uuid(),
  company_name                text not null,
  companies_house_number      text unique not null,
  companies_house_verified    boolean default false,
  companies_house_verified_at timestamptz,
  company_status              text,
  registered_postcode         text,
  account_type                text default 'client' check (account_type in ('client', 'trade', 'both')),
  primary_contact_user_id     uuid references public.users (id) on delete set null,
  average_rating              numeric(3, 2) default 0,
  total_reviews               int default 0,
  payment_speed_score         numeric(3, 2) default 0,
  scope_change_score          numeric(3, 2) default 0,
  red_flag_count              int default 0,
  created_at                  timestamptz default now()
);

alter table public.organisations enable row level security;

-- ============================================================
-- ORGANISATION MEMBERS
-- ============================================================
create table public.organisation_members (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid references public.organisations (id) on delete cascade,
  user_id         uuid references public.users (id) on delete cascade,
  role            text check (role in ('owner', 'admin', 'member')),
  invited_by      uuid references public.users (id),
  joined_at       timestamptz default now()
);

alter table public.organisation_members enable row level security;

-- ============================================================
-- FK: users.organisation_id → organisations.id
-- Added here because organisations didn't exist in migration 000.
-- ============================================================
alter table public.users
  add constraint users_organisation_id_fkey
  foreign key (organisation_id) references public.organisations (id) on delete set null;

-- ============================================================
-- SECURITY-DEFINER HELPERS
-- Used in RLS policies to avoid recursive self-joins on
-- organisation_members (querying the same table inside a policy
-- for that table causes Postgres to apply the policy again,
-- leading to infinite recursion). SECURITY DEFINER bypasses RLS
-- so the helper can read the raw membership rows safely.
-- ============================================================
create or replace function public.get_user_org_role(org_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role
  from public.organisation_members
  where organisation_id = org_id
    and user_id = auth.uid()
  limit 1
$$;

-- ============================================================
-- RLS POLICIES — ORGANISATIONS
-- Any member can read their own org's row (name, status, scores).
-- Only the service-role client may insert (no INSERT policy).
-- ============================================================
create policy "organisations_select_member"
  on public.organisations
  for select
  using (public.get_user_org_role(id) is not null);

-- ============================================================
-- RLS POLICIES — ORGANISATION MEMBERS
-- • Owners and admins can read all member rows for their org.
-- • Regular members (and owners/admins) can always read their own row.
-- Only the service-role client may insert (no INSERT policy).
-- ============================================================
create policy "organisation_members_select"
  on public.organisation_members
  for select
  using (
    user_id = auth.uid()
    or public.get_user_org_role(organisation_id) in ('owner', 'admin')
  );
