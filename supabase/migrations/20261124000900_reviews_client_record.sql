-- v4.2 phase 9: reviews on WorkedWith jobs (Airbnb style) and the client record (PRD 13, 14, 21).

alter table public.review_windows
  add column if not exists flow text not null default 'legacy',
  add column if not exists opened_reason text,
  add column if not exists closed_at timestamptz,
  add column if not exists reminder_3_sent_at timestamptz,
  add column if not exists reminder_10_sent_at timestamptz;
alter table public.review_windows drop constraint if exists review_windows_flow_check;
alter table public.review_windows add constraint review_windows_flow_check check (flow in ('legacy', 'quote'));
alter table public.review_windows drop constraint if exists review_windows_opened_reason_check;
alter table public.review_windows add constraint review_windows_opened_reason_check
  check (opened_reason is null or opened_reason in ('paid', 'overdue_30_days', 'cancelled_after_start'));

alter table public.reviews
  add column if not exists label text,
  add column if not exists published_at timestamptz,
  add column if not exists updated_at timestamptz;
alter table public.reviews drop constraint if exists reviews_label_check;
alter table public.reviews add constraint reviews_label_check check (label is null or label in ('paid_job', 'unpaid', 'ended_early'));

-- Up to 5 photos per review, through the existing photo moderation (PRD 13)
create table if not exists public.review_photos (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  path text not null,
  moderation_status text not null default 'approved' check (moderation_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);
create index if not exists review_photos_review_idx on public.review_photos (review_id);
alter table public.review_photos enable row level security;
-- Photos follow their review: visible once the review is published, or to the author
create policy "review photos visible with review" on public.review_photos for select using (
  exists (select 1 from public.reviews r where r.id = review_id and (r.is_visible = true or r.reviewer_id = auth.uid())));
grant all on public.review_photos to service_role;

-- Audit of trades seeing a client's record, and the 12 month rule for quoting trades (PRD 14)
create table if not exists public.client_record_views (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.users (id) on delete cascade,
  client_id uuid not null references public.users (id) on delete cascade,
  reason text not null check (reason in ('quoting', 'lookup')),
  job_id uuid references public.jobs (id) on delete set null,
  viewed_at timestamptz not null default now()
);
create index if not exists client_record_views_pair_idx on public.client_record_views (trade_id, client_id, viewed_at desc);
alter table public.client_record_views enable row level security;
create policy "trades read own record views" on public.client_record_views for select using (trade_id = auth.uid());
grant all on public.client_record_views to service_role;
