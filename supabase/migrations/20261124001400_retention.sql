-- v4.2 phase 14: record retention and account closure (PRD 11, key rule 20).
-- Accounts with WorkedWith jobs are closed, not deleted: the login is removed and personal details are
-- scrubbed, while financial records are kept 6 years for the trade's tax and legal records.

alter table public.users add column if not exists closed_at timestamptz;
alter table public.trade_profiles add column if not exists closed_at timestamptz;

-- The bank details clients were told to pay, frozen on each invoice when it is issued, so closing a trade
-- account can delete the live bank details without changing issued invoices.
alter table public.invoices add column if not exists payee_snapshot_encrypted text;

-- When a job's records may be anonymised (6 years after it is paid or cancelled)
create index if not exists jobs_retain_until_idx on public.jobs (retain_until) where retain_until is not null;

alter table public.jobs add column if not exists anonymised_at timestamptz;
