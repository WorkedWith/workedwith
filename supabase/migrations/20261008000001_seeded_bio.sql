-- Optional bio on a seeded (unclaimed) listing, copied from the business's own public page.
alter table public.seeded_profiles add column if not exists bio text;
