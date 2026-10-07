-- Tradespeople are found by the districts they cover, not their own postcode.
-- The column stays (nullable) so nothing else breaks, and existing values are cleared
-- because a tradesperson's own postcode is no longer needed or shown anywhere.

alter table public.trade_profiles
  alter column postcode drop not null;

update public.trade_profiles
set postcode = null
where postcode is not null;
