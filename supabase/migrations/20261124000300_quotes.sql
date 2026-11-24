-- v4.2 phase 3: quotes (PRD 6, 21 quotes and jobs). Money is integer pence.

-- ── Jobs, extended ───────────────────────────────────────────
-- Old v3 jobs keep flow = 'legacy'. Every new job is created from a quote and has flow = 'quote'.
alter table public.jobs
  add column if not exists flow text not null default 'legacy',
  add column if not exists trade_user_id uuid references public.users (id) on delete set null,
  add column if not exists client_user_id uuid references public.users (id) on delete set null,
  add column if not exists title text,
  add column if not exists job_address text,
  add column if not exists source text not null default 'own_customer',
  add column if not exists current_quote_id uuid,
  add column if not exists client_type_at_acceptance text,
  add column if not exists agreed_start_date date,
  add column if not exists materials_ordered_at timestamptz,
  add column if not exists materials_order_evidence_path text,
  add column if not exists cancellation_period_ends_at timestamptz,
  add column if not exists early_start_consent_at timestamptz,
  add column if not exists early_start_consent_by_user_id uuid references public.users (id) on delete set null,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by_user_id uuid references public.users (id) on delete set null,
  add column if not exists cancellation_reason text,
  add column if not exists deposit_outcome text,
  add column if not exists made_to_measure_confirmed boolean,
  add column if not exists total_pence integer,
  add column if not exists booked_at timestamptz,
  add column if not exists retain_until timestamptz;

alter table public.jobs drop constraint if exists jobs_flow_check;
alter table public.jobs add constraint jobs_flow_check check (flow in ('legacy', 'quote'));
alter table public.jobs drop constraint if exists jobs_source_check;
alter table public.jobs add constraint jobs_source_check check (source in ('own_customer', 'directory'));
alter table public.jobs drop constraint if exists jobs_client_type_at_acceptance_check;
alter table public.jobs add constraint jobs_client_type_at_acceptance_check
  check (client_type_at_acceptance is null or client_type_at_acceptance in ('person', 'company'));
alter table public.jobs drop constraint if exists jobs_deposit_outcome_check;
alter table public.jobs add constraint jobs_deposit_outcome_check
  check (deposit_outcome is null or deposit_outcome in ('refund_due', 'refunded', 'retained'));

-- Old and new statuses side by side until the old flow is deleted after launch
alter table public.jobs drop constraint if exists jobs_status_check;
alter table public.jobs add constraint jobs_status_check check (status in (
  'pending_confirmation', 'active', 'completed', 'disputed', 'cancelled', 'ended_early',
  'quoted', 'booked', 'in_progress', 'paid'
));

create index if not exists jobs_trade_user_idx on public.jobs (trade_user_id) where flow = 'quote';
create index if not exists jobs_client_user_idx on public.jobs (client_user_id) where flow = 'quote';

-- Both parties can read their own v4.2 jobs. All writes go through server actions.
drop policy if exists "v42 job parties read" on public.jobs;
create policy "v42 job parties read" on public.jobs for select
  using (flow = 'quote' and (trade_user_id = auth.uid() or client_user_id = auth.uid()));

-- ── Quotes ───────────────────────────────────────────────────
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  trade_user_id uuid not null references public.users (id) on delete cascade,
  version integer not null default 1,
  status text not null default 'draft' check (status in
    ('draft', 'sent', 'viewed', 'accepted', 'changes_requested', 'declined', 'expired', 'withdrawn', 'superseded')),
  -- Client as the trade entered it on this version
  client_type text not null default 'person' check (client_type in ('person', 'company')),
  client_name text not null,
  client_company_name text,
  client_mobile text not null,
  client_email text not null,
  job_address text,
  title text not null,
  description text,
  photo_paths text[] not null default '{}',
  valid_until date not null,
  -- Deposit
  deposit_required boolean not null default false,
  deposit_mode text check (deposit_mode in ('amount', 'percent')),
  deposit_percent numeric(5,2),
  deposit_amount_pence integer not null default 0 check (deposit_amount_pence >= 0),
  deposit_for text check (deposit_for in ('materials', 'labour', 'materials_and_labour')),
  deposit_refundable boolean not null default true,
  deposit_non_refundable_from text check (deposit_non_refundable_from in ('materials_ordered', 'work_started', 'payment')),
  -- Payment and start
  payment_timing text not null default 'on_completion' check (payment_timing in ('on_completion', 'in_stages')),
  planned_start_type text not null default 'to_be_agreed' check (planned_start_type in ('date', 'asap', 'to_be_agreed')),
  planned_start_date date,
  -- Money
  vat_registered boolean not null default false,
  vat_applies boolean not null default false,
  vat_rate_bp integer not null default 2000,
  net_pence integer not null default 0,
  vat_pence integer not null default 0,
  total_pence integer not null default 0,
  -- Terms
  extra_terms text,
  terms_snapshot jsonb,
  follow_ups_enabled boolean not null default true,
  -- Lifecycle
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  accepted_by_user_id uuid references public.users (id) on delete set null,
  client_type_at_acceptance text check (client_type_at_acceptance in ('person', 'company')),
  early_start_consent_at timestamptz,
  declined_at timestamptz,
  declined_reason text,
  withdrawn_at timestamptz,
  expired_at timestamptz,
  deposit_due_by timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, version),
  check (deposit_non_refundable_from <> 'payment' or client_type = 'company'),
  check (planned_start_type <> 'date' or planned_start_date is not null)
);
create index if not exists quotes_trade_idx on public.quotes (trade_user_id, status);

alter table public.jobs drop constraint if exists jobs_current_quote_fk;
alter table public.jobs add constraint jobs_current_quote_fk foreign key (current_quote_id) references public.quotes (id) on delete set null;

create table if not exists public.quote_lines (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  position integer not null,
  description text not null,
  price_pence integer not null check (price_pence >= 0)
);
create index if not exists quote_lines_quote_idx on public.quote_lines (quote_id, position);

-- Planned stages on a quote (copied to payment_stages when accepted)
create table if not exists public.quote_stages (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  position integer not null,
  name text not null,
  amount_pence integer not null check (amount_pence > 0)
);

create table if not exists public.quote_change_requests (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  note text not null,
  requested_by_user_id uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_by_version integer
);

-- Automatic follow ups sent on a quote (one row per kind, so each is sent once)
create table if not exists public.quote_follow_ups (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  kind text not null,
  sent_at timestamptz not null default now(),
  unique (quote_id, kind)
);

-- ── Payment stages (filled in by phase 5) ─────────────────────
create table if not exists public.payment_stages (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  quote_id uuid references public.quotes (id) on delete set null,
  position integer not null,
  name text not null,
  amount_pence integer not null check (amount_pence >= 0),
  is_deposit boolean not null default false,
  status text not null default 'upcoming' check (status in
    ('upcoming', 'awaiting_approval', 'issue_raised', 'approved', 'requested_by_trade', 'part_paid', 'paid', 'overdue', 'cancelled')),
  marked_done_at timestamptz,
  approved_at timestamptz,
  approved_by_user_id uuid references public.users (id) on delete set null,
  requested_by_trade_at timestamptz,
  request_note text,
  due_at timestamptz,
  amount_paid_pence integer not null default 0,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists payment_stages_job_idx on public.payment_stages (job_id, position);

-- ── Saved items library ──────────────────────────────────────
create table if not exists public.saved_items (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.users (id) on delete cascade,
  description text not null,
  price_pence integer not null check (price_pence >= 0),
  vat_applies boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists saved_items_trade_idx on public.saved_items (trade_id);

-- ── RLS: trades see their own rows, clients see rows for their own jobs ──
alter table public.quotes enable row level security;
alter table public.quote_lines enable row level security;
alter table public.quote_stages enable row level security;
alter table public.quote_change_requests enable row level security;
alter table public.quote_follow_ups enable row level security;
alter table public.payment_stages enable row level security;
alter table public.saved_items enable row level security;

create policy "quote parties read" on public.quotes for select using (
  trade_user_id = auth.uid()
  or (status <> 'draft' and exists (select 1 from public.jobs j where j.id = job_id and j.client_user_id = auth.uid()))
);
create policy "quote lines parties read" on public.quote_lines for select using (
  exists (select 1 from public.quotes q join public.jobs j on j.id = q.job_id
          where q.id = quote_id and (q.trade_user_id = auth.uid() or (q.status <> 'draft' and j.client_user_id = auth.uid())))
);
create policy "quote stages parties read" on public.quote_stages for select using (
  exists (select 1 from public.quotes q join public.jobs j on j.id = q.job_id
          where q.id = quote_id and (q.trade_user_id = auth.uid() or (q.status <> 'draft' and j.client_user_id = auth.uid())))
);
create policy "change requests parties read" on public.quote_change_requests for select using (
  exists (select 1 from public.quotes q join public.jobs j on j.id = q.job_id
          where q.id = quote_id and (q.trade_user_id = auth.uid() or j.client_user_id = auth.uid()))
);
create policy "follow ups trade read" on public.quote_follow_ups for select using (
  exists (select 1 from public.quotes q where q.id = quote_id and q.trade_user_id = auth.uid())
);
create policy "stages parties read" on public.payment_stages for select using (
  exists (select 1 from public.jobs j where j.id = job_id and (j.trade_user_id = auth.uid() or j.client_user_id = auth.uid()))
);
create policy "saved items own" on public.saved_items for all using (trade_id = auth.uid()) with check (trade_id = auth.uid());

grant all on public.quotes, public.quote_lines, public.quote_stages, public.quote_change_requests,
  public.quote_follow_ups, public.payment_stages, public.saved_items to service_role;

-- ── Photos taken on site (quotes, stages, variations, materials) ──
insert into storage.buckets (id, name, public) values ('job-photos', 'job-photos', false)
  on conflict (id) do nothing;
-- No storage policies: uploads and signed URLs go through the server only.
