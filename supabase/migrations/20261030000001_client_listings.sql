-- v3.8 item 5: client added listings for trades not on WorkedWith
-- A submission waits for admin approval. Only on approval does a normal seeded listing exist,
-- so nothing unapproved can ever reach search, the sitemap or a public page.

alter table public.seeded_profiles
  add column if not exists source text not null default 'admin' check (source in ('admin', 'client_added')),
  add column if not exists added_by_client_id uuid references public.users(id) on delete set null,
  add column if not exists public_reference_url text;

create table public.client_listing_submissions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.users(id) on delete cascade,
  business_name text not null check (char_length(business_name) between 1 and 100),
  business_name_normalised text not null,
  trade_category text not null,
  district text not null,
  public_reference_url text check (public_reference_url is null or char_length(public_reference_url) <= 300),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'merged')),
  seeded_profile_id uuid references public.seeded_profiles(id) on delete set null,
  review_note text check (review_note is null or char_length(review_note) <= 300),
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index client_listing_submissions_client_idx on public.client_listing_submissions (client_id, created_at);
create index client_listing_submissions_status_idx on public.client_listing_submissions (status, created_at);
alter table public.client_listing_submissions enable row level security;
-- No policies: admin and service role only. Clients never see what happened to a submission.

alter table public.pending_invites
  add column if not exists listing_submission_id uuid references public.client_listing_submissions(id) on delete set null,
  add column if not exists listing_id uuid references public.seeded_profiles(id) on delete set null;

-- Repeated rejections raise an integrity flag
alter table public.review_integrity_flags drop constraint if exists review_integrity_flags_flag_type_check;
alter table public.review_integrity_flags add constraint review_integrity_flags_flag_type_check check (flag_type in (
  'same_ip_both_parties',
  'same_device_both_parties',
  'velocity_spike',
  'postcode_distance_anomaly',
  'new_accounts_both_parties',
  'combined_signals',
  'false_decline',
  'repeated_unfounded_claims',
  'repeated_rejected_listings'
));
