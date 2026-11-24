-- v4.2 phase 2: client accounts from quote links (PRD 5, 21 client profiles).
-- client_type keeps its existing values: 'individual' means a person, 'business' means a company.

alter table public.client_profiles
  add column if not exists closed_at timestamptz,
  add column if not exists client_type_confirmed_at timestamptz;

-- Clients created from a quote may not have given a postcode
alter table public.client_profiles alter column postcode drop not null;

-- Links in texts and emails. Only a hash of the token is stored. Opening one always needs a text code
-- to the client's own mobile, so every approval comes from their signed in session (key rule 3).
create table if not exists public.client_access_links (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  client_user_id uuid not null references public.users (id) on delete cascade,
  purpose text not null default 'general'
    check (purpose in ('quote', 'job', 'variation', 'stage', 'invoice', 'review', 'general')),
  target_path text not null,
  created_by uuid references public.users (id) on delete set null,
  expires_at timestamptz not null default (now() + interval '180 days'),
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists client_access_links_client_idx on public.client_access_links (client_user_id);
alter table public.client_access_links enable row level security;
-- No client side access: links are resolved by the server only
grant all on public.client_access_links to service_role;
