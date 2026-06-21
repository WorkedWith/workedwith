create table public.profile_views (
  id uuid primary key default gen_random_uuid(),
  trade_profile_id uuid references public.trade_profiles(id) not null,
  viewed_at timestamptz default now(),
  viewer_id uuid references public.users(id),
  source text check (source in ('direct','search','share'))
);

create table public.search_appearances (
  id uuid primary key default gen_random_uuid(),
  trade_profile_id uuid references public.trade_profiles(id) not null,
  appeared_at timestamptz default now(),
  search_postcode text,
  search_trade_type text
);

alter table public.profile_views enable row level security;
alter table public.search_appearances enable row level security;

create policy "trades can read own profile views"
  on public.profile_views for select
  using (trade_profile_id in (select id from public.trade_profiles where user_id = auth.uid()));

create policy "trades can read own search appearances"
  on public.search_appearances for select
  using (trade_profile_id in (select id from public.trade_profiles where user_id = auth.uid()));

grant all privileges on public.profile_views to service_role;
grant all privileges on public.search_appearances to service_role;
grant select on public.profile_views to authenticated;
grant select on public.search_appearances to authenticated;
