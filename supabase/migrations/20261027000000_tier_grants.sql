-- Admin plan grants (PRD v3.8 item 6): give a trade Standard or Pro free for a set time.
-- Grants live entirely inside WorkedWith. No Stripe objects, no card.

create table public.tier_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  tier text not null check (tier in ('standard','pro')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  reason text not null default 'other' check (reason in ('founding','goodwill','partnership','other')),
  note text,
  granted_by uuid references public.users(id) on delete set null,
  ended_at timestamptz,
  ended_reason text check (ended_reason in ('expired','ended_early','superseded')),
  ended_by uuid references public.users(id) on delete set null,
  started_email_sent_at timestamptz,
  reminder_14_sent_at timestamptz,
  reminder_3_sent_at timestamptz,
  ended_email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- One open (active or scheduled) grant per trade
create unique index tier_grants_one_open_per_user on public.tier_grants (user_id) where ended_at is null;
create index tier_grants_open_idx on public.tier_grants (ends_at) where ended_at is null;

create table public.tier_grant_events (
  id uuid primary key default gen_random_uuid(),
  grant_id uuid not null references public.tier_grants(id) on delete cascade,
  action text not null check (action in ('created','extended','tier_changed','ended_early','expired','superseded')),
  actor uuid references public.users(id) on delete set null,
  before_values jsonb,
  after_values jsonb,
  created_at timestamptz not null default now()
);

create index tier_grant_events_grant_idx on public.tier_grant_events (grant_id, created_at);

alter table public.tier_grants enable row level security;
alter table public.tier_grant_events enable row level security;

-- A trade can read their own grants. Everything else goes through the service role (admin screens).
create policy "trades can read own grants"
  on public.tier_grants
  for select using (user_id = auth.uid());
