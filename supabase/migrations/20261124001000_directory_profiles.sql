-- v4.2 phase 10: directory and profiles (PRD 15).
-- Email now clicks on member and seeded profiles, for profile activity and seeded reminder emails.
create table if not exists public.profile_contact_clicks (
  id uuid primary key default gen_random_uuid(),
  trade_profile_id uuid references public.trade_profiles (id) on delete cascade,
  seeded_profile_id uuid references public.seeded_profiles (id) on delete cascade,
  kind text not null default 'email_now' check (kind in ('email_now', 'call')),
  viewer_role text,
  created_at timestamptz not null default now(),
  check (trade_profile_id is not null or seeded_profile_id is not null)
);
create index if not exists profile_contact_clicks_trade_idx on public.profile_contact_clicks (trade_profile_id, created_at);
create index if not exists profile_contact_clicks_seeded_idx on public.profile_contact_clicks (seeded_profile_id, created_at);
alter table public.profile_contact_clicks enable row level security;
-- Written and read by the server only
grant all on public.profile_contact_clicks to service_role;

-- Seeded profile views, for the same activity figures on seeded listings
create table if not exists public.seeded_profile_views (
  id uuid primary key default gen_random_uuid(),
  seeded_profile_id uuid not null references public.seeded_profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists seeded_profile_views_idx on public.seeded_profile_views (seeded_profile_id, created_at);
alter table public.seeded_profile_views enable row level security;
grant all on public.seeded_profile_views to service_role;
