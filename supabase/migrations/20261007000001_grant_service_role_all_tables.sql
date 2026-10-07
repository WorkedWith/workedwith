-- Newer tables were created without explicit service_role grants, so server
-- actions using the admin client failed with "permission denied".
-- Grant on every existing public table and set defaults for future ones.
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
