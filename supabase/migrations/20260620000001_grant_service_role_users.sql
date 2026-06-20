-- Grant full access to service_role on users table
grant all privileges on public.users to service_role;

-- Also ensure authenticated role has correct permissions
grant select, insert, update on public.users to authenticated;

-- Grant anon role read access for public profile lookups
grant select on public.users to anon;
