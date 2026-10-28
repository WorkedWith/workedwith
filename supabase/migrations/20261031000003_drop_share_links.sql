-- Client profile links are now permanent (/c/username, signed in trades only), so expiring share links go.
drop function if exists public.bump_share_link(uuid, boolean);
drop table if exists public.client_share_links;
