-- v4.2 phase 6: credit notes (PRD 11). Invoices are never edited once issued; refunds and reductions are
-- credit notes with their own sequential numbers per trade.

alter table public.trade_profiles add column if not exists next_credit_note_number integer not null default 1;

create table if not exists public.credit_notes (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete restrict,
  trade_id uuid not null references public.users (id) on delete restrict,
  job_id uuid not null references public.jobs (id) on delete restrict,
  payment_id uuid references public.payments (id) on delete set null,
  credit_note_number text not null,
  sequence integer not null,
  amount_pence integer not null check (amount_pence > 0),
  net_pence integer not null,
  vat_pence integer not null default 0,
  reason text not null,
  kind text not null default 'refund' check (kind in ('refund', 'reduction')),
  issued_at timestamptz not null default now(),
  pdf_path text,
  unique (trade_id, credit_note_number),
  unique (trade_id, sequence)
);
create index if not exists credit_notes_trade_idx on public.credit_notes (trade_id, issued_at);

create or replace function public.allocate_credit_note_number(p_trade uuid)
returns table (seq integer, prefix text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_seq integer;
  v_prefix text;
begin
  update public.trade_profiles
    set next_credit_note_number = next_credit_note_number + 1
    where user_id = p_trade
    returning next_credit_note_number - 1, coalesce(invoice_prefix, 'INV') into v_seq, v_prefix;
  if v_seq is null then
    raise exception 'trade profile not found';
  end if;
  return query select v_seq, v_prefix;
end;
$$;
revoke all on function public.allocate_credit_note_number(uuid) from public, anon, authenticated;
grant execute on function public.allocate_credit_note_number(uuid) to service_role;

alter table public.credit_notes enable row level security;
create policy "credit notes parties read" on public.credit_notes for select using (
  trade_id = auth.uid() or exists (select 1 from public.jobs j where j.id = job_id and j.client_user_id = auth.uid()));
grant all on public.credit_notes to service_role;
