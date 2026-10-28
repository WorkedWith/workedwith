-- v3.8 item 2: trade job links

alter table public.trade_profiles add column if not exists job_link_paused boolean not null default false;

alter table public.pending_invites
  add column if not exists source text not null default 'client_invite'
    check (source in ('client_invite', 'trade_link')),
  add column if not exists job_state text not null default 'finished'
    check (job_state in ('finished', 'in_progress')),
  add column if not exists job_month date,
  add column if not exists postcode_district text,
  add column if not exists target_user_id uuid references public.users(id) on delete cascade;

create index if not exists pending_invites_target_idx on public.pending_invites (target_user_id, created_at)
  where source = 'trade_link';

-- Simple counts for the trade's dashboard. No visitor identities.
create table public.job_link_events (
  id uuid primary key default gen_random_uuid(),
  trade_profile_id uuid not null references public.trade_profiles(id) on delete cascade,
  kind text not null check (kind in ('visit', 'request', 'cap_hit')),
  created_at timestamptz not null default now()
);
create index job_link_events_idx on public.job_link_events (trade_profile_id, kind, created_at);
alter table public.job_link_events enable row level security;
-- No policies: service role only.
