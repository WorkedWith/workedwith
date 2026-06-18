alter table public.jobs
  add column logged_from_ip text,
  add column logged_from_user_agent text,
  add column confirmed_from_ip text,
  add column confirmed_from_user_agent text;

create table public.review_integrity_flags (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid references public.jobs(id),
  flag_type       text check (flag_type in (
                    'same_ip_both_parties',
                    'same_device_both_parties',
                    'velocity_spike',
                    'postcode_distance_anomaly',
                    'new_accounts_both_parties'
                  )),
  details         text,
  flagged_at      timestamptz default now(),
  reviewed_by     uuid references public.users(id),
  reviewed_at     timestamptz,
  outcome         text default 'pending' check (outcome in ('pending', 'dismissed', 'actioned'))
);

alter table public.review_integrity_flags enable row level security;
