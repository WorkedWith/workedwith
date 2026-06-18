-- Tracks uploaded ID documents submitted for manual review
create table public.verification_documents (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references public.users(id) not null,
  storage_path     text not null,
  outcome          text not null default 'pending'
                   check (outcome in ('pending', 'approved', 'rejected')),
  submitted_at     timestamptz default now(),
  reviewed_at      timestamptz,
  reviewed_by      uuid references public.users(id),
  rejection_reason text
);

alter table public.verification_documents enable row level security;

-- Users can insert their own docs (upload flow)
create policy "vd_insert_own" on public.verification_documents
  for insert with check (user_id = auth.uid());

-- Users can read their own docs
create policy "vd_select_own" on public.verification_documents
  for select using (user_id = auth.uid());

-- Admins read/write via service role (no RLS policy needed — bypasses RLS)
