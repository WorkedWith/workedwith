alter table public.pending_invites
  add column if not exists reminder_count int not null default 0,
  add column if not exists last_reminded_at timestamptz;
