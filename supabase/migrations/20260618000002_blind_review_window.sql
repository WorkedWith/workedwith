alter table public.review_windows
  add column if not exists blind_window_closes_at timestamptz;
