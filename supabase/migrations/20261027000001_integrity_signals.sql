-- Integrity flag rework (PRD v3.8 item 1): combined scoring, hashed network signals.

-- New flag type for scored, multi signal flags
alter table public.review_integrity_flags drop constraint if exists review_integrity_flags_flag_type_check;
alter table public.review_integrity_flags add constraint review_integrity_flags_flag_type_check check (flag_type in (
  'same_ip_both_parties',
  'same_device_both_parties',
  'velocity_spike',
  'postcode_distance_anomaly',
  'new_accounts_both_parties',
  'combined_signals'
));

-- Salted hashes of network and coarse device, recorded at sign up and review submission.
-- Used only to detect fake reviews. Deleted after 90 days by the daily cron.
create table public.integrity_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null check (kind in ('signup','review')),
  job_id uuid references public.jobs(id) on delete cascade,
  ip_hash text,
  device_hash text,
  created_at timestamptz not null default now()
);

create index integrity_signals_user_idx on public.integrity_signals (user_id);
create index integrity_signals_ip_idx on public.integrity_signals (ip_hash) where ip_hash is not null;
create index integrity_signals_created_idx on public.integrity_signals (created_at);

-- Server only (service role). No policies on purpose.
alter table public.integrity_signals enable row level security;
