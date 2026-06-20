-- Allow authenticated users to read their own row
create policy "users can read own row"
  on public.users
  for select
  using (auth.uid() = id);

-- Allow authenticated users to update their own row
create policy "users can update own row"
  on public.users
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Allow authenticated users to insert their own row
create policy "users can insert own row"
  on public.users
  for insert
  with check (auth.uid() = id);

grant select, update, insert on public.users to authenticated;
