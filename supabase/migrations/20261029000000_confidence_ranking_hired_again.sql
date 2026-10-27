-- v3.9 items 2 and 3: confidence ranking inputs and "hired again"

-- ── Category averages (m in the ranking formula) ─────────────
create table public.category_rating_averages (
  trade_type text primary key,          -- '*' is the platform wide average
  avg_rating numeric(4, 3) not null,
  review_count int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.category_rating_averages enable row level security;
-- No policies: read and written by the service role only.

create or replace function public.refresh_category_averages() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.category_rating_averages;

  insert into public.category_rating_averages (trade_type, avg_rating, review_count)
  select '*',
         round((sum(average_rating * total_reviews) / nullif(sum(total_reviews), 0))::numeric, 3),
         sum(total_reviews)::int
  from public.trade_profiles
  where total_reviews > 0;

  insert into public.category_rating_averages (trade_type, avg_rating, review_count)
  select t.trade_type,
         round((sum(tp.average_rating * tp.total_reviews) / nullif(sum(tp.total_reviews), 0))::numeric, 3),
         sum(tp.total_reviews)::int
  from public.trade_profiles tp, unnest(tp.trade_types) as t(trade_type)
  where tp.total_reviews > 0
  group by t.trade_type;
end $$;
revoke all on function public.refresh_category_averages() from public, anon, authenticated;
grant execute on function public.refresh_category_averages() to service_role;

select public.refresh_category_averages();

-- ── Hired again ──────────────────────────────────────────────
alter table public.trade_profiles add column if not exists hired_again_count int not null default 0;

create or replace function public.job_start_date(
  p_started date, p_period text, p_completed timestamptz, p_confirmed timestamptz, p_created timestamptz
) returns date
language plpgsql immutable as $$
declare d date;
begin
  if p_started is not null then return p_started; end if;
  if p_period is not null then
    begin
      d := to_date(p_period, 'FMMonth YYYY');
      return d;
    exception when others then
      null;
    end;
  end if;
  return coalesce(p_completed, p_confirmed, p_created)::date;
end $$;

create or replace function public.refresh_hired_again(p_trade uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_trade is null then return; end if;
  update public.trade_profiles tp
  set hired_again_count = coalesce((
    select count(*)::int from (
      select client_profile_id
      from public.jobs j
      where j.trade_profile_id = p_trade
        and j.client_profile_id is not null
        and j.status in ('active', 'completed', 'disputed', 'ended_early')
      group by client_profile_id
      having count(*) >= 2
         and max(public.job_start_date(j.started_at::date, j.backdated_period, j.completed_at, j.confirmed_at, j.created_at))
           - min(public.job_start_date(j.started_at::date, j.backdated_period, j.completed_at, j.confirmed_at, j.created_at)) >= 14
    ) x
  ), 0)
  where tp.id = p_trade;
end $$;
revoke all on function public.refresh_hired_again(uuid) from public, anon, authenticated;
grant execute on function public.refresh_hired_again(uuid) to service_role;

create or replace function public.jobs_refresh_hired_again() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_hired_again(old.trade_profile_id);
    return old;
  end if;
  perform public.refresh_hired_again(new.trade_profile_id);
  if tg_op = 'UPDATE' and old.trade_profile_id is distinct from new.trade_profile_id then
    perform public.refresh_hired_again(old.trade_profile_id);
  end if;
  return new;
end $$;

create trigger jobs_hired_again_trg
after insert or delete or update of status, client_profile_id, trade_profile_id, started_at on public.jobs
for each row execute function public.jobs_refresh_hired_again();

-- Backfill
do $$
declare r record;
begin
  for r in select id from public.trade_profiles loop
    perform public.refresh_hired_again(r.id);
  end loop;
end $$;
