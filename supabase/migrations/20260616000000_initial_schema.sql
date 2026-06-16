-- Enable pgcrypto for gen_random_uuid()
create extension if not exists pgcrypto;

-- ============================================================
-- USERS
-- ============================================================
create table public.users (
  id                      uuid primary key references auth.users on delete cascade,
  email                   text unique not null,
  user_type               text check (user_type in ('tradesperson', 'client', 'both')),
  client_type             text check (client_type in ('individual', 'business')),
  full_name               text not null,
  phone                   text unique,
  phone_verified          boolean default false,
  verification_tier       text default 'unverified' check (verification_tier in ('unverified', 'phone_verified', 'fully_verified')),
  licence_number_hash     text unique,
  id_verification_status  text default 'not_submitted' check (id_verification_status in ('not_submitted', 'pending', 'approved', 'rejected')),
  id_submitted_at         timestamptz,
  id_reviewed_at          timestamptz,
  id_reviewed_by          uuid references public.users (id),
  previously_deactivated  boolean default false,
  created_at              timestamptz default now(),
  subscription_tier       text default 'free' check (subscription_tier in ('free', 'pro', 'team')),
  subscription_status     text default 'inactive' check (subscription_status in ('active', 'inactive', 'trialling')),
  stripe_customer_id      text,
  organisation_id         uuid
);

alter table public.users enable row level security;

create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- Auto-create user row on sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- TRADE PROFILES
-- ============================================================
create table public.trade_profiles (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.users (id) on delete cascade not null,
  trade_type     text not null,
  company_name   text,
  postcode       text not null,
  username       text unique not null,
  bio            text,
  average_rating numeric(3, 2) default 0,
  total_reviews  int default 0,
  created_at     timestamptz default now()
);

alter table public.trade_profiles enable row level security;

create policy "trade_profiles_select_all" on public.trade_profiles
  for select using (true);

create policy "trade_profiles_insert_own" on public.trade_profiles
  for insert with check (auth.uid() = user_id);

create policy "trade_profiles_update_own" on public.trade_profiles
  for update using (auth.uid() = user_id);

create policy "trade_profiles_delete_own" on public.trade_profiles
  for delete using (auth.uid() = user_id);

-- ============================================================
-- CLIENT PROFILES
-- ============================================================
create table public.client_profiles (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid references public.users (id) on delete cascade not null,
  postcode             text not null,
  average_rating       numeric(3, 2) default 0,
  total_reviews        int default 0,
  payment_speed_score  numeric(3, 2) default 0,
  scope_change_score   numeric(3, 2) default 0,
  communication_score  numeric(3, 2) default 0,
  red_flag_count       int default 0,
  created_at           timestamptz default now()
);

alter table public.client_profiles enable row level security;

-- Tradespersons can view client profiles (needed for review/trust checks)
-- Owners can read and update their own profile
create policy "client_profiles_select_own" on public.client_profiles
  for select using (auth.uid() = user_id);

create policy "client_profiles_insert_own" on public.client_profiles
  for insert with check (auth.uid() = user_id);

create policy "client_profiles_update_own" on public.client_profiles
  for update using (auth.uid() = user_id);

create policy "client_profiles_delete_own" on public.client_profiles
  for delete using (auth.uid() = user_id);
