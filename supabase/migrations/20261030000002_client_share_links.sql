-- v3.8 item 4: client share links

create table public.client_share_links (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid not null references public.users(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  open_count int not null default 0,
  trade_view_count int not null default 0,
  created_at timestamptz not null default now()
);
create index client_share_links_owner_idx on public.client_share_links (client_user_id, created_at);
alter table public.client_share_links enable row level security;

create policy "owners can read their own share links"
  on public.client_share_links
  for select using (client_user_id = auth.uid());
-- Creating, counting and revoking go through the server (service role).

create or replace function public.bump_share_link(p_id uuid, p_trade boolean) returns void
language sql security definer set search_path = public as $$
  update public.client_share_links
  set open_count = open_count + 1,
      trade_view_count = trade_view_count + case when p_trade then 1 else 0 end
  where id = p_id;
$$;
revoke all on function public.bump_share_link(uuid, boolean) from public, anon, authenticated;
grant execute on function public.bump_share_link(uuid, boolean) to service_role;
