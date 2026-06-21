alter table public.disputes
  add column if not exists is_priority boolean default false;
