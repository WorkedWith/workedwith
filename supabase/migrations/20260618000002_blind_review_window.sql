alter table public.review_windows
  add column blind_window_closes_at timestamptz
  generated always as (window_opened_at + interval '7 days') stored;
