-- Day 4 reminder to whoever has not yet submitted their review.
alter table public.review_windows
  add column if not exists reminder_4_sent_at timestamptz;
