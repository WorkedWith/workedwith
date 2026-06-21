-- Featured jobs system (Standard + Pro subscribers)

create table public.featured_jobs (
  id uuid primary key default gen_random_uuid(),
  trade_profile_id uuid references public.trade_profiles(id) not null,
  job_id uuid references public.jobs(id),
  title text not null,
  created_at timestamptz default now()
);

create table public.featured_job_images (
  id uuid primary key default gen_random_uuid(),
  featured_job_id uuid references public.featured_jobs(id) not null,
  storage_path text not null,
  caption text,
  display_order int default 0,
  moderation_status text default 'pending' check (moderation_status in ('pending','approved','rejected')),
  created_at timestamptz default now()
);

alter table public.featured_jobs enable row level security;
alter table public.featured_job_images enable row level security;

create policy "trades can manage own featured jobs"
  on public.featured_jobs
  for all using (
    trade_profile_id in (
      select id from public.trade_profiles where user_id = auth.uid()
    )
  );

create policy "public can view featured jobs"
  on public.featured_jobs
  for select using (true);

create policy "public can view approved featured job images"
  on public.featured_job_images
  for select using (moderation_status = 'approved');

create policy "trades can manage own featured job images"
  on public.featured_job_images
  for all using (
    featured_job_id in (
      select fj.id from public.featured_jobs fj
      join public.trade_profiles tp on fj.trade_profile_id = tp.id
      where tp.user_id = auth.uid()
    )
  );

-- Storage bucket for featured job images
insert into storage.buckets (id, name, public)
values ('featured-job-images', 'featured-job-images', true);

create policy "trades can upload featured job images"
  on storage.objects for insert
  with check (bucket_id = 'featured-job-images' and auth.role() = 'authenticated');

create policy "public can view featured job images"
  on storage.objects for select
  using (bucket_id = 'featured-job-images');

create policy "trades can delete own featured job images"
  on storage.objects for delete
  using (bucket_id = 'featured-job-images' and auth.role() = 'authenticated');
