-- Client usernames: the short handle a client gives to tradespeople so they can be looked up.
-- Unique, case insensitive. Existing individual clients get a generated one they can change.

alter table public.client_profiles
  add column if not exists username text;

-- Backfill: letters and numbers from the display name (max 14) plus 4 characters from the row id
update public.client_profiles
set username = left(
      coalesce(nullif(regexp_replace(lower(coalesce(display_name, '')), '[^a-z0-9]', '', 'g'), ''), 'client'),
      14
    ) || substr(md5(id::text), 1, 4)
where username is null
  and coalesce(client_type, 'individual') = 'individual';

create unique index if not exists client_profiles_username_unique
  on public.client_profiles (lower(username))
  where username is not null;
