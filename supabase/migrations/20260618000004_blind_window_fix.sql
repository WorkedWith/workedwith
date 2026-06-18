alter table public.review_windows
  add column if not exists blind_window_closes_at timestamptz;

update public.review_windows
  set blind_window_closes_at = window_opened_at + interval '7 days'
  where blind_window_closes_at is null;
