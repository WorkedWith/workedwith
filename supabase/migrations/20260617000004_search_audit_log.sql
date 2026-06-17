create table public.search_audit_log (
  id              uuid primary key default gen_random_uuid(),
  searcher_id     uuid references public.users(id),
  search_type     text default 'client_lookup',
  identifier_hash text,
  result          text check (result in ('match_found', 'no_match', 'rate_limited')),
  searched_at     timestamptz default now(),
  ip_address      text
);

alter table public.search_audit_log enable row level security;
-- No read policy for users — admin only via service role
