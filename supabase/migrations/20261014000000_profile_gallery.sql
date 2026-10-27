-- Profile gallery (Standard 5 photos, Pro 10 photos) and visitor reports on photos.
-- Job linked featured photos (featured_jobs) become Pro only in code; no schema change there.

create table public.profile_gallery_images (
  id uuid primary key default gen_random_uuid(),
  trade_profile_id uuid references public.trade_profiles(id) on delete cascade not null,
  storage_path text not null,
  caption text,
  display_order int default 0,
  moderation_status text default 'pending' check (moderation_status in ('pending','approved','rejected')),
  created_at timestamptz default now()
);

create index profile_gallery_images_trade_idx on public.profile_gallery_images (trade_profile_id);

alter table public.profile_gallery_images enable row level security;

create policy "trades can manage own gallery images"
  on public.profile_gallery_images
  for all using (
    trade_profile_id in (select id from public.trade_profiles where user_id = auth.uid())
  );

create policy "public can view approved gallery images"
  on public.profile_gallery_images
  for select using (moderation_status = 'approved');

create table public.photo_reports (
  id uuid primary key default gen_random_uuid(),
  gallery_image_id uuid references public.profile_gallery_images(id) on delete cascade,
  featured_image_id uuid references public.featured_job_images(id) on delete cascade,
  reporter_id uuid references public.users(id) on delete set null,
  reason text,
  status text not null default 'open' check (status in ('open','dismissed','removed')),
  created_at timestamptz default now(),
  check (gallery_image_id is not null or featured_image_id is not null)
);

create index photo_reports_open_idx on public.photo_reports (status, created_at);

-- Reports are written and read by the server only (service role). No policies on purpose.
alter table public.photo_reports enable row level security;
