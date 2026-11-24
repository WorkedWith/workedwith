-- v4.2 phase 12: seeded listings (PRD 16). 90 day life, reminders at day 30, 60 and 80 with activity,
-- outreach only to active limited companies (PECR). Phone numbers are never seeded for outreach.

alter table public.seeded_profiles
  add column if not exists companies_house_number text,
  add column if not exists companies_house_status text,
  add column if not exists company_type text,
  add column if not exists incorporated_on date,
  add column if not exists companies_house_checked_at timestamptz;

-- Existing unclaimed listings move to the 90 day life
update public.seeded_profiles
  set expires_at = greatest(expires_at, created_at + interval '90 days')
  where status = 'unclaimed';
