-- v4.2 phase 5: stages and payments (PRD 9, 11, 21).
-- Invoices are created here (not phase 6) because the invoice number is the payment reference that
-- automatic matching needs. Phase 6 adds PDFs, credit notes and exports.

alter table public.payment_stages
  add column if not exists client_says_paid_at timestamptz,
  add column if not exists approval_reminder_5_at timestamptz,
  add column if not exists approval_reminder_10_at timestamptz,
  add column if not exists approval_reminder_14_at timestamptz,
  add column if not exists last_manual_reminder_at timestamptz,
  add column if not exists last_trade_response_at timestamptz,
  add column if not exists stalled_notified_at timestamptz,
  add column if not exists cancelled_at timestamptz;

create table if not exists public.stage_evidence (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.payment_stages (id) on delete cascade,
  photo_paths text[] not null default '{}',
  note text,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.stage_issues (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.payment_stages (id) on delete cascade,
  raised_by_user_id uuid references public.users (id) on delete set null,
  reason text not null,
  photo_paths text[] not null default '{}',
  status text not null default 'open' check (status in ('open', 'resubmitted', 'resolved', 'closed_by_request')),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- The only back and forth on the platform for a stage. Also used for dispute notes (PRD 21, 22).
create table if not exists public.issue_notes (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.stage_issues (id) on delete cascade,
  author_user_id uuid references public.users (id) on delete set null,
  note text not null,
  photo_paths text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ── Invoices (sequential per trade, allocated in a transaction) ──
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.users (id) on delete restrict,
  job_id uuid not null references public.jobs (id) on delete restrict,
  stage_id uuid references public.payment_stages (id) on delete set null,
  invoice_number text not null,
  sequence integer not null,
  issued_at timestamptz not null default now(),
  due_at timestamptz not null,
  net_pence integer not null,
  vat_pence integer not null default 0,
  total_pence integer not null,
  amount_paid_pence integer not null default 0,
  status text not null default 'issued' check (status in ('issued', 'part_paid', 'paid', 'credited')),
  approval_basis text not null check (approval_basis in ('client_approved', 'requested_by_trade', 'deposit')),
  description text not null,
  pdf_path text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (trade_id, invoice_number),
  unique (trade_id, sequence)
);
create index if not exists invoices_trade_status_idx on public.invoices (trade_id, status);
create index if not exists invoices_job_idx on public.invoices (job_id);

-- Allocate the next invoice number inside one transaction so numbers never skip or repeat (key rule 22)
create or replace function public.allocate_invoice_number(p_trade uuid)
returns table (seq integer, prefix text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_seq integer;
  v_prefix text;
begin
  update public.trade_profiles
    set next_invoice_number = next_invoice_number + 1
    where user_id = p_trade
    returning next_invoice_number - 1, coalesce(invoice_prefix, 'INV') into v_seq, v_prefix;
  if v_seq is null then
    raise exception 'trade profile not found';
  end if;
  return query select v_seq, v_prefix;
end;
$$;
revoke all on function public.allocate_invoice_number(uuid) from public, anon, authenticated;
grant execute on function public.allocate_invoice_number(uuid) to service_role;

-- ── Payments ──
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.payment_stages (id) on delete restrict,
  invoice_id uuid references public.invoices (id) on delete restrict,
  job_id uuid not null references public.jobs (id) on delete restrict,
  amount_pence integer not null check (amount_pence > 0),
  method text not null check (method in ('bank_transfer_matched', 'bank_transfer_marked_by_trade', 'paid_elsewhere_cash',
    'paid_elsewhere_cheque', 'paid_elsewhere_other_account', 'card', 'wallet')),
  bank_match_id uuid references public.bank_matches (id) on delete set null,
  stripe_payment_intent_id text,
  stripe_fee_pence integer,
  status text not null default 'paid' check (status in ('client_says_paid', 'paid', 'failed', 'refunded')),
  paid_at timestamptz not null default now(),
  recorded_by uuid references public.users (id) on delete set null,
  client_confirmed_at timestamptz,
  client_disputed_at timestamptz,
  refunded_pence integer not null default 0,
  refund_marked_at timestamptz,
  refund_client_confirmed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists payments_job_idx on public.payments (job_id);

alter table public.bank_matches drop constraint if exists bank_matches_invoice_fk;
alter table public.bank_matches add constraint bank_matches_invoice_fk foreign key (invoice_id) references public.invoices (id) on delete set null;

-- ── RLS ──
alter table public.stage_evidence enable row level security;
alter table public.stage_issues enable row level security;
alter table public.issue_notes enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;

create policy "evidence parties read" on public.stage_evidence for select using (
  exists (select 1 from public.payment_stages s join public.jobs j on j.id = s.job_id
          where s.id = stage_id and (j.trade_user_id = auth.uid() or j.client_user_id = auth.uid())));
create policy "issues parties read" on public.stage_issues for select using (
  exists (select 1 from public.payment_stages s join public.jobs j on j.id = s.job_id
          where s.id = stage_id and (j.trade_user_id = auth.uid() or j.client_user_id = auth.uid())));
create policy "issue notes parties read" on public.issue_notes for select using (
  exists (select 1 from public.stage_issues i join public.payment_stages s on s.id = i.stage_id join public.jobs j on j.id = s.job_id
          where i.id = issue_id and (j.trade_user_id = auth.uid() or j.client_user_id = auth.uid())));
create policy "invoices parties read" on public.invoices for select using (
  trade_id = auth.uid() or exists (select 1 from public.jobs j where j.id = job_id and j.client_user_id = auth.uid()));
create policy "payments parties read" on public.payments for select using (
  exists (select 1 from public.jobs j where j.id = job_id and (j.trade_user_id = auth.uid() or j.client_user_id = auth.uid())));

grant all on public.stage_evidence, public.stage_issues, public.issue_notes, public.invoices, public.payments to service_role;
