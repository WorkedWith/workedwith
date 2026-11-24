-- v4.2 phase 8: automated chasing, letter before action and claim pack (PRD 10, 21).

alter table public.jobs
  add column if not exists chasing_paused boolean not null default false,
  add column if not exists chasing_stopped boolean not null default false;

create table if not exists public.chase_events (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.payment_stages (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  step text not null,
  channel text not null default 'email_and_text',
  sent_at timestamptz not null default now(),
  opened_at timestamptz,
  paused boolean not null default false,
  stopped_by uuid references public.users (id) on delete set null,
  unique (stage_id, step)
);
create index if not exists chase_events_job_idx on public.chase_events (job_id, sent_at);

create table if not exists public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  type text not null check (type in ('letter_before_action', 'claim_pack', 'chargeback_evidence')),
  version text check (version in ('person', 'company')),
  file_path text,
  data jsonb,
  generated_at timestamptz not null default now(),
  sent_at timestamptz,
  response_due_at timestamptz,
  created_by uuid references public.users (id) on delete set null
);
create index if not exists legal_documents_job_idx on public.legal_documents (job_id, type);

alter table public.chase_events enable row level security;
alter table public.legal_documents enable row level security;
create policy "chase events parties read" on public.chase_events for select using (
  exists (select 1 from public.jobs j where j.id = job_id and (j.trade_user_id = auth.uid() or j.client_user_id = auth.uid())));
-- Letters are shared with the client once sent; the claim pack is for the trade only
create policy "legal docs parties read" on public.legal_documents for select using (
  exists (select 1 from public.jobs j where j.id = job_id and (j.trade_user_id = auth.uid()
    or (j.client_user_id = auth.uid() and type = 'letter_before_action' and sent_at is not null))));
grant all on public.chase_events, public.legal_documents to service_role;
