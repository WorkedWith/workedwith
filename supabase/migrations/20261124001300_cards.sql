-- v4.2 phase 13: optional card payments on the trade's own Stripe account (PRD 9, 21).
-- Stripe Connect accounts are set up so Stripe handles pricing: Stripe charges its fee to the trade, and
-- WorkedWith takes nothing. Never a "platform handles pricing" set up (PRD 24).

create table if not exists public.trade_card_accounts (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null unique references public.users (id) on delete cascade,
  stripe_account_id text not null,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  card_limit_pence integer not null default 100000 check (card_limit_pence >= 1000),
  cards_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.trade_card_accounts enable row level security;
create policy "trades read own card account" on public.trade_card_accounts for select using (trade_id = auth.uid());
grant all on public.trade_card_accounts to service_role;

create table if not exists public.chargebacks (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete restrict,
  job_id uuid not null references public.jobs (id) on delete restrict,
  trade_id uuid not null references public.users (id) on delete cascade,
  stripe_dispute_id text not null unique,
  amount_pence integer not null,
  reason text,
  opened_at timestamptz not null default now(),
  evidence_due_at timestamptz,
  evidence_note text,
  evidence_submitted_at timestamptz,
  deadline_reminder_sent_at timestamptz,
  outcome text check (outcome in ('won', 'lost', 'warning_closed')),
  closed_at timestamptz
);
alter table public.chargebacks enable row level security;
create policy "trades read own chargebacks" on public.chargebacks for select using (trade_id = auth.uid());
grant all on public.chargebacks to service_role;
