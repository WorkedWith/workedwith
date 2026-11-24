-- PRD 20 phase 0 item 8 and decision 11: reset test data before the first real trade.
-- NOT a migration. Run by hand, once, against the right project, after checking the counts below.
-- Keeps seeded listings and real accounts. Removes jobs, reviews, review windows and invites made in testing.
--
--   psql "$DATABASE_URL" -f supabase/scripts/reset-test-data.sql
--
begin;

select 'jobs' as t, count(*) from public.jobs
union all select 'reviews', count(*) from public.reviews
union all select 'review_windows', count(*) from public.review_windows
union all select 'job_invites', count(*) from public.job_invites
union all select 'pending_invites', count(*) from public.pending_invites;

delete from public.disputes;
delete from public.reviews;
delete from public.review_windows;
delete from public.job_invites;
delete from public.pending_invites;
delete from public.job_early_end_details;
delete from public.featured_job_images where featured_job_id in (select id from public.featured_jobs where job_id is not null);
delete from public.featured_jobs where job_id is not null;
delete from public.review_integrity_flags where job_id is not null;
delete from public.jobs;

update public.trade_profiles set average_rating = 0, total_reviews = 0, total_jobs = 0,
  confirmation_counted = 0, confirmation_confirmed = 0, hired_again_count = 0, ended_early_count = 0;
update public.client_profiles set average_rating = 0, total_reviews = 0, total_jobs = 0,
  payment_reliability_score = 0, scope_clarity_score = 0, communication_score = 0,
  confirmation_counted = 0, confirmation_confirmed = 0, ended_early_count = 0;
-- red_flag_count is kept as a column (key rule 21) but test values are cleared
update public.client_profiles set red_flag_count = 0;

-- Change to commit once the counts above look right
rollback;
