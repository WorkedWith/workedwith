-- ============================================================
-- PENDING INVITES — client-initiated trade claim flow (v3.1)
-- ============================================================

create extension if not exists pgcrypto;

create table public.pending_invites (
  id                    uuid primary key default gen_random_uuid(),
  inviting_client_id    uuid not null references public.users(id) on delete cascade,
  trade_name            text not null,
  job_type              text not null,
  description           text,
  job_date              text not null,
  contact_phone         text,
  contact_email         text,
  status                text not null default 'sent'
    check (status in ('sent', 'expired', 'claimed', 'disputed')),
  claim_token           text unique not null,
  claimed_by_user_id    uuid references public.users(id),
  claimed_at            timestamptz,
  resulting_job_id      uuid references public.jobs(id),
  created_at            timestamptz not null default now(),
  expires_at            timestamptz not null default (now() + interval '60 days'),
  constraint pending_invites_contact_required
    check (contact_phone is not null or contact_email is not null)
);

alter table public.pending_invites enable row level security;

-- Inviting client can read their own invites
create policy "pending_invites_select_own_client" on public.pending_invites
  for select using (auth.uid() = inviting_client_id);

-- Claimed trade can read invites they claimed
create policy "pending_invites_select_claimed_trade" on public.pending_invites
  for select using (auth.uid() = claimed_by_user_id);

-- Clients can insert their own invites
create policy "pending_invites_insert_own" on public.pending_invites
  for insert with check (auth.uid() = inviting_client_id);

-- Dedup lookup indexes
create index pending_invites_phone_idx
  on public.pending_invites (contact_phone)
  where status = 'sent';

create index pending_invites_email_idx
  on public.pending_invites (contact_email)
  where status = 'sent';

-- Expiry cron index
create index pending_invites_expires_idx
  on public.pending_invites (expires_at)
  where status = 'sent';
