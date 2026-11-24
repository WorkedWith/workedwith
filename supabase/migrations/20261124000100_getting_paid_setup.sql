-- v4.2 phase 1: getting paid set up (PRD 4 step 2 and 3, 11 bank data, 21 getting paid).
-- Money is integer pence. Bank account numbers are encrypted by the app (AES 256 GCM) before they reach the database.

-- ── Trade profile: business details used on quotes and invoices ──
alter table public.trade_profiles
  add column if not exists trading_address text,
  add column if not exists business_email text,
  add column if not exists business_phone text,
  add column if not exists reply_email text,
  add column if not exists vat_number text,
  add column if not exists logo_path text,
  add column if not exists extra_terms text,
  add column if not exists invoice_prefix text,
  add column if not exists next_invoice_number integer not null default 1,
  add column if not exists default_deposit_for text,
  add column if not exists default_deposit_refundable boolean not null default true,
  add column if not exists default_non_refundable_from text,
  add column if not exists payment_terms_days integer not null default 7,
  add column if not exists part_payments_enabled boolean not null default true;

alter table public.trade_profiles drop constraint if exists trade_profiles_payment_terms_days_check;
alter table public.trade_profiles add constraint trade_profiles_payment_terms_days_check
  check (payment_terms_days between 0 and 30);
alter table public.trade_profiles drop constraint if exists trade_profiles_default_deposit_for_check;
alter table public.trade_profiles add constraint trade_profiles_default_deposit_for_check
  check (default_deposit_for is null or default_deposit_for in ('materials', 'labour', 'materials_and_labour'));
alter table public.trade_profiles drop constraint if exists trade_profiles_default_non_refundable_from_check;
alter table public.trade_profiles add constraint trade_profiles_default_non_refundable_from_check
  check (default_non_refundable_from is null or default_non_refundable_from in ('materials_ordered', 'work_started', 'payment'));

-- ── Bank details and the open banking connection ──
create table if not exists public.trade_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null unique references public.users (id) on delete cascade,
  account_name text not null,
  sort_code text not null check (sort_code ~ '^[0-9]{6}$'),
  account_number_encrypted text not null,
  account_number_last4 text not null check (account_number_last4 ~ '^[0-9]{4}$'),
  confirmation_of_payee_result text check (confirmation_of_payee_result in ('match', 'close_match', 'no_match', 'unavailable')),
  confirmation_of_payee_name text,
  confirmation_of_payee_checked_at timestamptz,
  provider text,
  provider_connection_id text,
  provider_bank_name text,
  connected_at timestamptz,
  consent_expires_at timestamptz,
  last_synced_at timestamptz,
  connection_status text not null default 'not_connected'
    check (connection_status in ('not_connected', 'connected', 'needs_reconfirm', 'lapsed', 'unsupported')),
  reconfirm_notified_at timestamptz,
  lapsed_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trade_bank_accounts enable row level security;
-- Trades read their own row. Writes go through the server (service role) so the account number is always encrypted.
create policy "trades read own bank account"
  on public.trade_bank_accounts for select using (trade_id = auth.uid());
grant all on public.trade_bank_accounts to service_role;

-- Short lived state for an open banking connection in progress
create table if not exists public.open_banking_connect_states (
  state text primary key,
  trade_id uuid not null references public.users (id) on delete cascade,
  provider text not null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);
alter table public.open_banking_connect_states enable row level security;
-- No client access at all
grant all on public.open_banking_connect_states to service_role;

-- Only payments matched or suggested for an invoice are ever stored (PRD 11, key rule 10)
create table if not exists public.bank_matches (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.users (id) on delete cascade,
  provider_transaction_id text not null,
  received_at timestamptz not null,
  amount_pence integer not null check (amount_pence > 0),
  payer_name text,
  reference text,
  match_status text not null
    check (match_status in ('matched', 'part_payment', 'overpayment', 'suggested', 'confirmed_by_trade', 'rejected_by_trade')),
  invoice_id uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (trade_id, provider_transaction_id)
);
create index if not exists bank_matches_trade_status_idx on public.bank_matches (trade_id, match_status);
alter table public.bank_matches enable row level security;
create policy "trades read own bank matches"
  on public.bank_matches for select using (trade_id = auth.uid());
grant all on public.bank_matches to service_role;

-- Cost tracking per connected trade (PRD 21 other, admin bank connection health)
create table if not exists public.open_banking_usage (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.users (id) on delete cascade,
  month date not null,
  connection_active boolean not null default false,
  data_refreshes integer not null default 0,
  cost_pence integer not null default 0,
  unique (trade_id, month)
);
alter table public.open_banking_usage enable row level security;
-- Admin only, through the service role
grant all on public.open_banking_usage to service_role;
