-- ============================================================
-- ADDITIONAL RLS POLICIES — PROFILE ONBOARDING
--
-- Policies for INSERT/UPDATE on trade_profiles and client_profiles
-- (owner-only) were applied in migration 000. This migration adds
-- the cross-role SELECT policy needed for the trust/review system:
-- tradespeople must be able to view client profiles when deciding
-- whether to take on a job.
-- ============================================================

-- Tradespeople and users who operate as both roles can view all client profiles.
-- The row-level check joins back to public.users so it stays in sync with
-- user_type changes without needing a separate index.
create policy "client_profiles_select_as_tradesperson"
  on public.client_profiles
  for select
  using (
    -- Always allow owners to see their own profile
    auth.uid() = user_id
    or
    -- Allow tradespeople (or 'both') to view any client profile
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.user_type in ('tradesperson', 'both')
    )
  );
