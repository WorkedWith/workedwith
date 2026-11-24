-- v4.2 phase 7: variations (PRD 8, 21).
create table if not exists public.variations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  created_by uuid references public.users (id) on delete set null,
  description text not null,
  note text,
  amount_pence integer not null check (amount_pence <> 0),
  photo_paths text[] not null default '{}',
  status text not null default 'sent' check (status in ('sent', 'approved', 'declined', 'withdrawn')),
  target_stage_id uuid references public.payment_stages (id) on delete set null,
  new_stage_name text,
  sent_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by_user_id uuid references public.users (id) on delete set null,
  decline_note text,
  applied_to_stage_id uuid references public.payment_stages (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists variations_job_idx on public.variations (job_id, created_at);

alter table public.variations enable row level security;
create policy "variations parties read" on public.variations for select using (
  exists (select 1 from public.jobs j where j.id = job_id and (j.trade_user_id = auth.uid() or j.client_user_id = auth.uid())));
grant all on public.variations to service_role;
