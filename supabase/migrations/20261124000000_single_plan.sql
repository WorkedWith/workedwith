-- v4.2 phase 0: one plan for every trade (PRD 3, 20 phase 0).
-- £19.99 a month after a 30 day free trial with no card. subscription_tier is no longer read by the app.
-- It stays in place for now so nothing breaks while the code moves over; drop it after launch.

alter table public.trade_profiles
  add column if not exists trial_started_at timestamptz default now(),
  add column if not exists trial_ends_at timestamptz default (now() + interval '30 days'),
  add column if not exists subscription_status text not null default 'trialing';

alter table public.trade_profiles drop constraint if exists trade_profiles_subscription_status_check;
alter table public.trade_profiles
  add constraint trade_profiles_subscription_status_check
  check (subscription_status in ('trialing', 'active', 'lapsed', 'cancelled'));

-- Existing paying trades become active subscribers. Everyone else starts a fresh 30 day trial.
update public.trade_profiles
  set subscription_status = 'active'
  where subscription_tier in ('standard', 'pro') and stripe_subscription_id is not null;

update public.trade_profiles
  set subscription_status = 'trialing',
      trial_started_at = coalesce(trial_started_at, now()),
      trial_ends_at = greatest(coalesce(trial_ends_at, now()), now() + interval '30 days')
  where subscription_status <> 'active';

-- Every trade with an active trial or plan is listed (PRD 15)
update public.trade_profiles set is_searchable = true where subscription_status in ('trialing', 'active');

-- Trial reminder bookkeeping (day 23, 28 and 30)
alter table public.trade_profiles
  add column if not exists trial_reminder_23_sent_at timestamptz,
  add column if not exists trial_reminder_28_sent_at timestamptz,
  add column if not exists trial_reminder_30_sent_at timestamptz;

-- Admin plan grants now grant "the plan" rather than Standard or Pro
alter table public.tier_grants drop constraint if exists tier_grants_tier_check;
update public.tier_grants set tier = 'plan' where tier in ('standard', 'pro');
alter table public.tier_grants add constraint tier_grants_tier_check check (tier in ('plan'));
alter table public.tier_grants alter column tier set default 'plan';

-- Dispute priority was a Pro benefit. Same priority for everyone now.
update public.disputes set is_priority = false where is_priority = true;

-- ── Boosted Districts add-on (PRD 15) ─────────────────────────
-- Admin switches boosts on per district.
create table if not exists public.boost_district_settings (
  district    text primary key,
  boosts_enabled boolean not null default false,
  enabled_at  timestamptz,
  enabled_by  uuid references public.users (id) on delete set null,
  updated_at  timestamptz not null default now()
);

alter table public.boost_district_settings enable row level security;
-- Anyone signed in can see which districts take boosts. Writes go through the service role.
create policy "boost district settings readable"
  on public.boost_district_settings for select
  using (auth.role() = 'authenticated');
grant all on public.boost_district_settings to service_role;

-- Waiting list when all 3 slots for a trade type in a district are taken
create table if not exists public.boost_waitlist (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  district    text not null,
  trade_type  text not null,
  created_at  timestamptz not null default now(),
  notified_at timestamptz,
  removed_at  timestamptz
);
create unique index if not exists boost_waitlist_open_unique
  on public.boost_waitlist (user_id, district, trade_type) where removed_at is null;
create index if not exists boost_waitlist_slot_idx on public.boost_waitlist (district, trade_type, created_at);

alter table public.boost_waitlist enable row level security;
create policy "trades read own waitlist rows"
  on public.boost_waitlist for select
  using (user_id = auth.uid());
grant all on public.boost_waitlist to service_role;

-- Old included boosts are gone: boosts are only for trades on the paid plan.
-- Trades still in their trial lose any boosts they had.
update public.trade_profiles
  set boosted_districts = '{}', boosted_districts_updated_at = null,
      boosted_district_addon_quantity = 0, boosted_district_addon_paid_quantity = 0
  where subscription_status <> 'active';

-- v4.2 adds many notification kinds (quotes, jobs, payments). The type is now free text set by the server.
alter table public.notifications drop constraint if exists notifications_type_check;
