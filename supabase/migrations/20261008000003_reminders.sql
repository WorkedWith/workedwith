-- Trade can nudge a client who has not confirmed a job (rate limited in code).
alter table public.job_invites
  add column if not exists last_reminded_at timestamptz,
  add column if not exists reminder_count integer not null default 0;

-- One reminder email to trades who have not started ID verification.
alter table public.users
  add column if not exists id_reminder_sent_at timestamptz;
