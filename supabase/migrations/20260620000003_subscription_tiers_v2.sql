-- Update subscription tier constraint to three-tier model (free / standard / pro).
-- The previous constraint allowed 'free', 'pro', 'team'.
-- 'team' is retired; 'standard' is added.

alter table public.trade_profiles
  drop constraint if exists trade_profiles_subscription_tier_check;

alter table public.trade_profiles
  add constraint trade_profiles_subscription_tier_check
  check (subscription_tier in ('free', 'standard', 'pro'));

-- Migrate any existing 'team' rows to 'pro' (same or higher feature set).
update public.trade_profiles
  set subscription_tier = 'pro'
  where subscription_tier = 'team';

-- Billing period tracking (monthly / annual).
alter table public.trade_profiles
  add column if not exists billing_period text not null default 'monthly'
  check (billing_period in ('monthly', 'annual'));

-- Subscription expiry — set by webhook on each renewal event.
alter table public.trade_profiles
  add column if not exists subscription_expires_at timestamptz;
