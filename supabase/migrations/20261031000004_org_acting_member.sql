-- Business accounts: record which team member acted in the business's name
alter table public.jobs add column if not exists confirmed_by_user_id uuid references public.users(id) on delete set null;
alter table public.reviews add column if not exists submitted_by_user_id uuid references public.users(id) on delete set null;
alter table public.job_early_end_details add column if not exists acted_by_user_id uuid references public.users(id) on delete set null;
