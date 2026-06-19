-- Update handle_new_user trigger to persist user_type from signup metadata.
-- The client passes user_type in options.data during supabase.auth.signUp(),
-- which lands in raw_user_meta_data. We cast to text; the check constraint
-- on users.user_type will reject any value that isn't a valid enum member.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, user_type)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    (new.raw_user_meta_data->>'user_type')::text
  )
  on conflict (id) do update
    set user_type = excluded.user_type
    where public.users.user_type is null;
  return new;
end;
$$;
