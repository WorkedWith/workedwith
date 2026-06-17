-- ── Blind review mechanic ─────────────────────────────────────
-- Replace the old "participants can read own reviews" policy with
-- "only visible reviews are readable" so neither party can see the
-- other's review until both have submitted.
drop policy if exists "reviews_select" on public.reviews;

create policy "reviews_select_visible_only" on public.reviews
  for select using (is_visible = true);

-- Participants in a completed job can insert their own review.
create policy "reviews_insert_participant" on public.reviews
  for insert with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.jobs j
      where j.id = reviews.job_id
        and j.status = 'completed'
        and (
          exists (
            select 1 from public.trade_profiles tp
            where tp.id = j.trade_profile_id and tp.user_id = auth.uid()
          )
          or exists (
            select 1 from public.client_profiles cp
            where cp.id = j.client_profile_id and cp.user_id = auth.uid()
          )
        )
    )
  );

-- Participants can update the review_windows row for their job
-- (needed to set trade_review_submitted / client_review_submitted flags).
create policy "review_windows_update_participant" on public.review_windows
  for update using (
    exists (
      select 1 from public.jobs j
      join public.trade_profiles tp on tp.id = j.trade_profile_id
      where j.id = review_windows.job_id and tp.user_id = auth.uid()
    )
    or exists (
      select 1 from public.jobs j
      join public.client_profiles cp on cp.id = j.client_profile_id
      where j.id = review_windows.job_id and cp.user_id = auth.uid()
    )
  );
