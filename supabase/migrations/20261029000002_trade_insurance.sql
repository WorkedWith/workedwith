-- v3.9 item 4: insurance tag (public liability)

create table public.trade_insurance (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trade_profiles(id) on delete cascade,
  insurer text not null check (char_length(insurer) between 2 and 80),
  cover_amount_gbp bigint not null check (cover_amount_gbp >= 100000),
  expires_on date not null,
  storage_path text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'expired', 'replaced')),
  reject_reason text check (reject_reason is null or char_length(reject_reason) <= 300),
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  reminded_30_at timestamptz,
  reminded_7_at timestamptz,
  files_deleted_at timestamptz,
  created_at timestamptz not null default now()
);

-- One certificate waiting for review per trade
create unique index trade_insurance_one_pending on public.trade_insurance (trade_id) where status = 'pending';
create index trade_insurance_trade_idx on public.trade_insurance (trade_id, status);
create index trade_insurance_expiry_idx on public.trade_insurance (expires_on) where status = 'approved';

alter table public.trade_insurance enable row level security;

create policy "trades can read their own insurance rows"
  on public.trade_insurance
  for select using (
    exists (select 1 from public.trade_profiles tp where tp.id = trade_insurance.trade_id and tp.user_id = auth.uid())
  );
-- Writes and files: service role and admin only.

insert into storage.buckets (id, name, public)
values ('trade-insurance', 'trade-insurance', false)
on conflict (id) do nothing;
