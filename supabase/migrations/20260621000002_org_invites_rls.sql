-- Allow org owners and admins to read invites for their org
create policy "org admins can read invites"
  on public.organisation_invites
  for select using (
    organisation_id in (
      select organisation_id from public.organisation_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- Allow org owners and admins to insert invites
create policy "org admins can insert invites"
  on public.organisation_invites
  for insert with check (
    organisation_id in (
      select organisation_id from public.organisation_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- Allow anyone to read their own invite by email
create policy "invitees can read own invites"
  on public.organisation_invites
  for select using (email = (select email from public.users where id = auth.uid()));
