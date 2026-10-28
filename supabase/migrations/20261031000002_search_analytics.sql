-- Demand analytics: every Find search, what happened next, weekly rollups, admin settings.
create table public.search_events (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  district      text not null,
  trade_category text not null,
  specialism    text,
  viewer_role   text not null check (viewer_role in ('logged_out','client','trade','admin')),
  user_id       uuid references public.users(id) on delete set null,
  session_hash  text not null,
  real_count    int not null default 0,
  seeded_count  int not null default 0,
  boosted_count int not null default 0,
  demo_shown    boolean not null default false
);
create index search_events_created_idx on public.search_events (created_at);
create index search_events_district_idx on public.search_events (district, trade_category);
alter table public.search_events enable row level security;

create table public.search_outcomes (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  search_event_id  uuid references public.search_events(id) on delete set null,
  kind             text not null check (kind in ('profile_view','contact_click')),
  contact_type     text check (contact_type in ('call','email')),
  trade_profile_id uuid references public.trade_profiles(id) on delete cascade,
  district         text,
  trade_category   text,
  viewer_role      text
);
create index search_outcomes_created_idx on public.search_outcomes (created_at);
alter table public.search_outcomes enable row level security;

create table public.search_weekly_rollups (
  week            date not null,
  district        text not null,
  trade_category  text not null,
  viewer_role     text not null,
  searches        int not null default 0,
  unique_searchers int not null default 0,
  profile_views   int not null default 0,
  contact_clicks  int not null default 0,
  primary key (week, district, trade_category, viewer_role)
);
alter table public.search_weekly_rollups enable row level security;

create table public.admin_settings (
  key   text primary key,
  value jsonb not null
);
alter table public.admin_settings enable row level security;
insert into public.admin_settings (key, value) values ('focus_districts', '["WA14","WA15"]'::jsonb)
  on conflict (key) do nothing;

-- Roll up raw rows older than 12 months by week, then delete them.
create or replace function public.rollup_old_search_events() returns int
language plpgsql security definer set search_path = public as $$
declare cutoff timestamptz := now() - interval '12 months'; n int;
begin
  insert into public.search_weekly_rollups (week, district, trade_category, viewer_role, searches, unique_searchers)
  select date_trunc('week', created_at)::date, district, trade_category, viewer_role,
         count(*), count(distinct session_hash)
  from public.search_events where created_at < cutoff
  group by 1,2,3,4
  on conflict (week, district, trade_category, viewer_role) do update
    set searches = search_weekly_rollups.searches + excluded.searches,
        unique_searchers = search_weekly_rollups.unique_searchers + excluded.unique_searchers;

  insert into public.search_weekly_rollups (week, district, trade_category, viewer_role, profile_views, contact_clicks)
  select date_trunc('week', created_at)::date, coalesce(district,'unknown'), coalesce(trade_category,'unknown'), coalesce(viewer_role,'unknown'),
         count(*) filter (where kind='profile_view'), count(*) filter (where kind='contact_click')
  from public.search_outcomes where created_at < cutoff
  group by 1,2,3,4
  on conflict (week, district, trade_category, viewer_role) do update
    set profile_views = search_weekly_rollups.profile_views + excluded.profile_views,
        contact_clicks = search_weekly_rollups.contact_clicks + excluded.contact_clicks;

  delete from public.search_outcomes where created_at < cutoff;
  delete from public.search_events where created_at < cutoff;
  get diagnostics n = row_count;
  return n;
end $$;

grant all on public.search_events, public.search_outcomes, public.search_weekly_rollups, public.admin_settings to service_role;
