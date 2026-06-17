-- ── disputes table ───────────────────────────────────────────
create table public.disputes (
  id                     uuid primary key default gen_random_uuid(),
  review_id              uuid references public.reviews(id) not null,
  raised_by              uuid references public.users(id) not null,
  reason                 text check (reason in ('job_did_not_happen','factually_incorrect','defamatory','wrong_person','other')) not null,
  details                text not null,
  raised_at              timestamptz default now(),
  evidence_deadline      timestamptz default (now() + interval '7 days'),
  respondent_id          uuid references public.users(id) not null,
  respondent_evidence    text,
  respondent_submitted_at timestamptz,
  admin_decision         text default 'pending' check (admin_decision in ('pending','review_kept','review_removed','review_amended')),
  admin_decision_at      timestamptz,
  admin_decision_by      uuid references public.users(id),
  admin_notes            text,
  decision_deadline      timestamptz default (now() + interval '21 days'),
  notified_at            timestamptz
);

alter table public.disputes enable row level security;

create policy "participants can read own disputes" on public.disputes
  for select using (raised_by = auth.uid() or respondent_id = auth.uid());

create policy "users can raise disputes" on public.disputes
  for insert with check (raised_by = auth.uid());

create policy "respondent can submit evidence" on public.disputes
  for update using (respondent_id = auth.uid())
  with check (respondent_id = auth.uid());

-- ── dispute_status on reviews ─────────────────────────────────
alter table public.reviews
  add column dispute_status text default 'none'
  check (dispute_status in ('none','open','resolved_kept','resolved_removed','resolved_amended'));
