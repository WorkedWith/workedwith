-- PRD v3.7: decline reasons, confirmation rate and the evidence route.

-- ── 1. Decline reasons ───────────────────────────────────────
alter table public.pending_invites
  add column if not exists decline_reason text check (decline_reason in ('not_me','wont_confirm')),
  add column if not exists decline_note text check (decline_note is null or char_length(decline_note) <= 300),
  add column if not exists declined_at timestamptz,
  add column if not exists declined_by_user_id uuid references public.users(id) on delete set null,
  add column if not exists overturned_at timestamptz;

alter table public.job_invites
  add column if not exists decline_reason text check (decline_reason in ('not_me','wont_confirm')),
  add column if not exists decline_note text check (decline_note is null or char_length(decline_note) <= 300),
  add column if not exists declined_at timestamptz,
  add column if not exists declined_by_user_id uuid references public.users(id) on delete set null,
  add column if not exists overturned_at timestamptz;

-- ── 2. Confirmation rate ─────────────────────────────────────
-- One row per request a user received that reached an outcome. Used only to work out the rate.
create table public.request_outcomes (
  id uuid primary key default gen_random_uuid(),
  request_kind text not null check (request_kind in ('pending_invite','job_invite')),
  request_id uuid not null,
  recipient_id uuid not null references public.users(id) on delete cascade,
  requester_id uuid references public.users(id) on delete set null,
  outcome text not null check (outcome in ('confirmed','wont_confirm','not_me','expired_unanswered','overturned')),
  requested_at timestamptz not null,
  resolved_at timestamptz not null default now(),
  unique (request_kind, request_id)
);
create index request_outcomes_recipient_idx on public.request_outcomes (recipient_id, requested_at);
alter table public.request_outcomes enable row level security;

alter table public.trade_profiles
  add column if not exists confirmation_counted int not null default 0,
  add column if not exists confirmation_confirmed int not null default 0;
alter table public.client_profiles
  add column if not exists confirmation_counted int not null default 0,
  add column if not exists confirmation_confirmed int not null default 0;

-- Counts each requester once (their first request in the window), over the last 24 months.
-- not_me declines are left out unless overturned. Written to whichever profile the user has.
create or replace function public.refresh_confirmation_stats(p_user uuid)
returns void
language sql
security definer
set search_path = public
as $$
  with firsts as (
    select distinct on (coalesce(requester_id, request_id)) outcome
    from public.request_outcomes
    where recipient_id = p_user and requested_at > now() - interval '24 months'
    order by coalesce(requester_id, request_id), requested_at
  ),
  s as (
    select
      count(*) filter (where outcome <> 'not_me')::int as counted,
      count(*) filter (where outcome = 'confirmed')::int as confirmed
    from firsts
  ),
  t as (
    update public.trade_profiles tp
      set confirmation_counted = s.counted, confirmation_confirmed = s.confirmed
      from s where tp.user_id = p_user
    returning 1
  )
  update public.client_profiles cp
    set confirmation_counted = s.counted, confirmation_confirmed = s.confirmed
    from s where cp.user_id = p_user;
$$;

create or replace function public.refresh_all_confirmation_stats()
returns void
language sql
security definer
set search_path = public
as $$
  select public.refresh_confirmation_stats(u)
  from (
    select recipient_id as u from public.request_outcomes
    union select user_id from public.trade_profiles where confirmation_counted > 0
    union select user_id from public.client_profiles where confirmation_counted > 0
  ) x;
$$;

revoke execute on function public.refresh_confirmation_stats(uuid) from public, anon, authenticated;
revoke execute on function public.refresh_all_confirmation_stats() from public, anon, authenticated;
grant execute on function public.refresh_confirmation_stats(uuid) to service_role;
grant execute on function public.refresh_all_confirmation_stats() to service_role;

-- ── 3. Evidence route ────────────────────────────────────────
create table public.job_evidence_claims (
  id uuid primary key default gen_random_uuid(),
  invite_kind text not null check (invite_kind in ('pending_invite','job_invite')),
  invite_id uuid not null,
  requester_id uuid not null references public.users(id) on delete cascade,
  respondent_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft','awaiting_response','under_review','upheld','not_upheld','withdrawn')),
  requester_statement text not null check (char_length(requester_statement) <= 500),
  respondent_statement text check (respondent_statement is null or char_length(respondent_statement) <= 500),
  evidence_types text[] not null default '{}',
  response_deadline timestamptz,
  decision_deadline timestamptz,
  decided_at timestamptz,
  decided_by uuid references public.users(id) on delete set null,
  decided_how text check (decided_how in ('admin','respondent_confirmed')),
  files_deleted_at timestamptz,
  created_at timestamptz not null default now()
);

-- One open claim per request
create unique index job_evidence_one_open on public.job_evidence_claims (invite_kind, invite_id)
  where status in ('draft','awaiting_response','under_review');
create index job_evidence_requester_idx on public.job_evidence_claims (requester_id, created_at);
create index job_evidence_respondent_idx on public.job_evidence_claims (respondent_id, status);

create table public.job_evidence_files (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.job_evidence_claims(id) on delete cascade,
  uploaded_by uuid references public.users(id) on delete set null,
  storage_path text not null,
  file_type text not null check (file_type in ('image','pdf')),
  evidence_type text not null check (evidence_type in ('invoice','bank_transfer','quote','messages','other')),
  created_at timestamptz not null default now()
);
create index job_evidence_files_claim_idx on public.job_evidence_files (claim_id);

alter table public.job_evidence_claims enable row level security;
alter table public.job_evidence_files enable row level security;

-- The two people involved can read their own claim rows. Files are server and admin only.
create policy "parties can read own evidence claims"
  on public.job_evidence_claims
  for select using (requester_id = auth.uid() or respondent_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('job-evidence', 'job-evidence', false)
on conflict (id) do nothing;

-- ── 4. New integrity flag types ──────────────────────────────
alter table public.review_integrity_flags drop constraint if exists review_integrity_flags_flag_type_check;
alter table public.review_integrity_flags add constraint review_integrity_flags_flag_type_check check (flag_type in (
  'same_ip_both_parties',
  'same_device_both_parties',
  'velocity_spike',
  'postcode_distance_anomaly',
  'new_accounts_both_parties',
  'combined_signals',
  'false_decline',
  'repeated_unfounded_claims'
));
