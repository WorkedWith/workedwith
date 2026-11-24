-- v4.2 phase 11: accounting integrations (PRD 12, 21). One way, WorkedWith to the accounting software.

create table if not exists public.accounting_connections (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null unique references public.users (id) on delete cascade,
  platform text not null check (platform in ('xero', 'quickbooks', 'freeagent', 'sage')),
  external_org_id text,
  external_org_name text,
  tokens_encrypted text,
  token_expires_at timestamptz,
  sales_account_code text,
  payment_account_id text,
  vat_mapping jsonb,
  sync_from date,
  status text not null default 'setup' check (status in ('setup', 'connected', 'expired', 'revoked', 'error')),
  connected_at timestamptz,
  expired_notified_at timestamptz,
  setup_options jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.accounting_connections enable row level security;
create policy "trades read own accounting connection" on public.accounting_connections for select using (trade_id = auth.uid());
grant all on public.accounting_connections to service_role;

create table if not exists public.accounting_connect_states (
  state text primary key,
  trade_id uuid not null references public.users (id) on delete cascade,
  platform text not null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);
alter table public.accounting_connect_states enable row level security;
grant all on public.accounting_connect_states to service_role;

create table if not exists public.accounting_sync_items (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.accounting_connections (id) on delete cascade,
  trade_id uuid not null references public.users (id) on delete cascade,
  entity_type text not null check (entity_type in ('contact', 'invoice', 'payment', 'credit_note', 'refund')),
  entity_id uuid not null,
  external_id text,
  status text not null default 'pending' check (status in ('pending', 'synced', 'failed')),
  attempts integer not null default 0,
  last_error text,
  first_attempt_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (connection_id, entity_type, entity_id)
);
create index if not exists accounting_sync_items_due_idx on public.accounting_sync_items (status, next_attempt_at);
alter table public.accounting_sync_items enable row level security;
create policy "trades read own sync items" on public.accounting_sync_items for select using (trade_id = auth.uid());
grant all on public.accounting_sync_items to service_role;
