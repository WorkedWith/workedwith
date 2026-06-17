-- Client-initiated backdated jobs are created before the tradesperson has confirmed,
-- so trade_profile_id starts null and is filled in when they accept the invite.
alter table public.jobs
  alter column trade_profile_id drop not null;
