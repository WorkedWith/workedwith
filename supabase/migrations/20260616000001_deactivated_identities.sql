-- ============================================================
-- DEACTIVATED IDENTITIES
-- Stores SHA-256 hashes of phone numbers, emails, and licence
-- numbers belonging to deactivated accounts. Used to block
-- re-registration without exposing the original PII.
-- ============================================================
create table public.deactivated_identities (
  id               uuid primary key default gen_random_uuid(),
  identity_hash    text not null,
  identity_type    text not null check (identity_type in ('phone', 'email', 'licence_number')),
  deactivated_at   timestamptz default now(),
  deactivated_by   uuid references public.users (id),
  reason           text
);

-- One hash+type pair per row (prevents duplicate entries for the same identity)
create unique index deactivated_identities_hash_type_idx
  on public.deactivated_identities (identity_hash, identity_type);

alter table public.deactivated_identities enable row level security;

-- No public SELECT policy — all reads go through the service-role client in admin operations
-- Admins query this table via createAdminClient() which bypasses RLS
