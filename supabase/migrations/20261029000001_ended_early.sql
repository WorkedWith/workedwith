-- v3.9 item 1: jobs that end early

do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.jobs'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%pending_confirmation%'
  loop
    execute format('alter table public.jobs drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.jobs add constraint jobs_status_check
  check (status in ('pending_confirmation', 'active', 'completed', 'disputed', 'cancelled', 'ended_early'));

alter table public.jobs
  add column if not exists ended_early_at timestamptz,
  add column if not exists outcome_disputed boolean not null default false,
  add column if not exists outcome_disputed_at timestamptz,
  add column if not exists last_stale_prompt_at timestamptz;

-- Who ended it and the private note live apart from jobs, so neither side can read them.
create table public.job_early_end_details (
  job_id uuid primary key references public.jobs(id) on delete cascade,
  ended_by uuid references public.users(id) on delete set null,
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now()
);
alter table public.job_early_end_details enable row level security;
-- No policies: service role only.

alter table public.trade_profiles  add column if not exists ended_early_count int not null default 0;
alter table public.client_profiles add column if not exists ended_early_count int not null default 0;

create or replace function public.refresh_ended_early(p_trade uuid, p_client uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_trade is not null then
    update public.trade_profiles
    set ended_early_count = (select count(*)::int from public.jobs where trade_profile_id = p_trade and status = 'ended_early' and not outcome_disputed)
    where id = p_trade;
  end if;
  if p_client is not null then
    update public.client_profiles
    set ended_early_count = (select count(*)::int from public.jobs where client_profile_id = p_client and status = 'ended_early' and not outcome_disputed)
    where id = p_client;
  end if;
end $$;
revoke all on function public.refresh_ended_early(uuid, uuid) from public, anon, authenticated;
grant execute on function public.refresh_ended_early(uuid, uuid) to service_role;

create or replace function public.jobs_refresh_ended_early() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_ended_early(old.trade_profile_id, old.client_profile_id);
    return old;
  end if;
  perform public.refresh_ended_early(new.trade_profile_id, new.client_profile_id);
  return new;
end $$;

create trigger jobs_ended_early_trg
after insert or delete or update of status, outcome_disputed on public.jobs
for each row execute function public.jobs_refresh_ended_early();
