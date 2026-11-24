-- v4.2 phase 4: start dates and job events (PRD 7, 21).

create table if not exists public.start_date_proposals (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  proposed_date date not null,
  proposed_by_user_id uuid references public.users (id) on delete set null,
  status text not null default 'proposed' check (status in ('proposed', 'confirmed', 'countered', 'withdrawn')),
  decided_at timestamptz,
  decided_by_user_id uuid references public.users (id) on delete set null,
  early_start_consent_given boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists start_date_proposals_job_idx on public.start_date_proposals (job_id, created_at desc);

-- A timeline of everything that happens on a job. Feeds both job pages, the claim pack and chargeback evidence.
create table if not exists public.job_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  kind text not null,
  actor_user_id uuid references public.users (id) on delete set null,
  summary text not null,
  data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists job_events_job_idx on public.job_events (job_id, created_at);

alter table public.jobs add column if not exists early_start_requested_at timestamptz;

alter table public.start_date_proposals enable row level security;
alter table public.job_events enable row level security;
create policy "start dates parties read" on public.start_date_proposals for select using (
  exists (select 1 from public.jobs j where j.id = job_id and (j.trade_user_id = auth.uid() or j.client_user_id = auth.uid()))
);
create policy "job events parties read" on public.job_events for select using (
  exists (select 1 from public.jobs j where j.id = job_id and (j.trade_user_id = auth.uid() or j.client_user_id = auth.uid()))
);
grant all on public.start_date_proposals, public.job_events to service_role;
