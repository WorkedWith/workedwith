-- ============================================================
-- SCHEMA v2.1 — PRD alignment
-- ============================================================

-- ── 1. users ─────────────────────────────────────────────────

-- user_type check: 'tradesperson'/'client' → 'trade'/'client_individual'/'client_business'
alter table public.users drop constraint if exists users_user_type_check;
alter table public.users add constraint users_user_type_check
  check (user_type in ('trade', 'client_individual', 'client_business', 'both'));

-- Subscription columns move to trade_profiles
alter table public.users drop column if exists subscription_tier;
alter table public.users drop column if exists subscription_status;

-- ── 2. trade_profiles ────────────────────────────────────────

-- Rename username → public_slug (column + unique constraint)
alter table public.trade_profiles rename column username to public_slug;

do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'trade_profiles_username_key'
      and table_name      = 'trade_profiles'
  ) then
    alter table public.trade_profiles
      rename constraint trade_profiles_username_key to trade_profiles_public_slug_key;
  end if;
end $$;

-- New columns
alter table public.trade_profiles
  add column if not exists trade_types        text[]  not null default '{}',
  add column if not exists years_experience   int,
  add column if not exists radius_miles       int     default 10,
  add column if not exists is_searchable      boolean default false,
  add column if not exists subscription_tier  text    default 'free'
    check (subscription_tier in ('free', 'pro', 'team')),
  add column if not exists stripe_customer_id      text,
  add column if not exists stripe_subscription_id  text,
  add column if not exists total_jobs         int     default 0;

-- Remove single-value trade_type (superseded by trade_types array)
alter table public.trade_profiles drop column if exists trade_type;

-- ── 3. client_profiles ───────────────────────────────────────

alter table public.client_profiles
  add column if not exists display_name             text,
  add column if not exists client_type              text check (client_type in ('individual', 'business')),
  add column if not exists company_name             text,
  add column if not exists companies_house_number   text,
  add column if not exists is_searchable            boolean default false,
  add column if not exists total_jobs               int default 0;

alter table public.client_profiles
  rename column payment_speed_score to payment_reliability_score;

alter table public.client_profiles
  rename column scope_change_score to scope_clarity_score;

-- ── 4. organisations ─────────────────────────────────────────

alter table public.organisations
  add column if not exists owner_id uuid references public.users (id);

-- ── 5. New tables ─────────────────────────────────────────────

create table public.jobs (
  id                       uuid primary key default gen_random_uuid(),
  trade_profile_id         uuid references public.trade_profiles (id) not null,
  client_profile_id        uuid references public.client_profiles (id),
  initiated_by             text check (initiated_by in ('trade', 'client')),
  job_type                 text not null,
  description              text,
  location                 text,
  postcode                 text,
  started_at               date,
  completed_at             date,
  status                   text default 'pending_confirmation'
    check (status in ('pending_confirmation', 'active', 'completed', 'disputed', 'cancelled')),
  is_backdated             boolean default false,
  backdated_period         text,
  confirmed_at             timestamptz,
  confirmation_token       uuid default gen_random_uuid(),
  confirmation_expires_at  timestamptz default (now() + interval '7 days'),
  agreed_payment_terms_days int,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

alter table public.jobs enable row level security;

-- Either job participant (via their profile) can read
create policy "jobs_select_participant" on public.jobs
  for select using (
    exists (
      select 1 from public.trade_profiles tp
      where tp.id = jobs.trade_profile_id and tp.user_id = auth.uid()
    )
    or exists (
      select 1 from public.client_profiles cp
      where cp.id = jobs.client_profile_id and cp.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────

create table public.review_windows (
  id                      uuid primary key default gen_random_uuid(),
  job_id                  uuid references public.jobs (id) not null unique,
  trade_review_submitted  boolean default false,
  client_review_submitted boolean default false,
  window_opened_at        timestamptz default now(),
  window_closes_at        timestamptz,
  reminder_7_sent_at      timestamptz,
  reminder_14_sent_at     timestamptz,
  both_submitted_at       timestamptz
);

alter table public.review_windows enable row level security;

create policy "review_windows_select_participant" on public.review_windows
  for select using (
    exists (
      select 1 from public.jobs j
      join public.trade_profiles tp on tp.id = j.trade_profile_id
      where j.id = review_windows.job_id and tp.user_id = auth.uid()
    )
    or exists (
      select 1 from public.jobs j
      join public.client_profiles cp on cp.id = j.client_profile_id
      where j.id = review_windows.job_id and cp.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────

create table public.reviews (
  id                        uuid primary key default gen_random_uuid(),
  job_id                    uuid references public.jobs (id) not null,
  reviewer_id               uuid references public.users (id) not null,
  reviewee_id               uuid references public.users (id) not null,
  reviewer_type             text check (reviewer_type in ('trade', 'client')),
  reviewee_type             text check (reviewee_type in ('trade', 'client')),
  overall_rating            int check (overall_rating between 1 and 5),
  payment_score             int check (payment_score between 1 and 5),
  scope_clarity_score       int check (scope_clarity_score between 1 and 5),
  site_access_score         int check (site_access_score between 1 and 5),
  red_flag                  boolean default false,
  red_flag_reason           text check (red_flag_reason in (
                              'aggressive_behaviour', 'refused_access', 'non_payment',
                              'false_dispute', 'unsafe_site', 'other'
                            )),
  quality_score             int check (quality_score between 1 and 5),
  reliability_score         int check (reliability_score between 1 and 5),
  value_score               int check (value_score between 1 and 5),
  communication_score       int check (communication_score between 1 and 5),
  would_work_again          boolean,
  written_review            text,
  agreed_payment_terms_days int,
  is_backdated              boolean default false,
  submitted_at              timestamptz default now(),
  is_visible                boolean default false,
  response_text             text,
  response_submitted_at     timestamptz,
  created_at                timestamptz default now()
);

alter table public.reviews enable row level security;

-- Participants can see their own reviews; public can see visible reviews
create policy "reviews_select" on public.reviews
  for select using (
    reviewer_id = auth.uid()
    or reviewee_id = auth.uid()
    or is_visible = true
  );

-- ─────────────────────────────────────────────────────────────

create table public.job_invites (
  id             uuid primary key default gen_random_uuid(),
  job_id         uuid references public.jobs (id) not null,
  inviter_id     uuid references public.users (id) not null,
  invitee_email  text,
  invitee_phone  text,
  invite_token   uuid default gen_random_uuid() unique,
  status         text default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'expired')),
  sent_at        timestamptz default now(),
  expires_at     timestamptz default (now() + interval '7 days'),
  responded_at   timestamptz
);

alter table public.job_invites enable row level security;

create policy "job_invites_select_inviter" on public.job_invites
  for select using (inviter_id = auth.uid());

-- Permissive select for token-based accept flow (UUID token is the security mechanism)
create policy "job_invites_select_by_token" on public.job_invites
  for select using (true);

-- ─────────────────────────────────────────────────────────────

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.users (id),
  type       text check (type in (
               'new_review', 'review_response', 'dispute_raised', 'dispute_evidence_due',
               'dispute_resolved', 'invite_accepted', 'job_confirmed', 'review_window_opened',
               'review_reminder', 'reviews_published', 'id_verified', 'id_rejected',
               'subscription_updated', 'red_flag_received'
             )),
  title      text,
  body       text,
  link       text,
  is_read    boolean default false,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select using (user_id = auth.uid());

create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid());
