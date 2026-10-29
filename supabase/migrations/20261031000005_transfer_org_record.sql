-- Moves a business's record (client profile, reviews, requests) to another team member.
-- Admin only: called with the service role from the admin screen.

create table if not exists public.org_record_transfers (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  from_user_id uuid references public.users(id) on delete set null,
  to_user_id uuid references public.users(id) on delete set null,
  done_by uuid references public.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
alter table public.org_record_transfers enable row level security;
-- No policies: only the service role reads or writes this table.

create or replace function public.transfer_org_record(p_org uuid, p_to uuid, p_admin uuid, p_note text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from uuid;
  v_profile uuid;
begin
  select coalesce(primary_contact_user_id, owner_id) into v_from from organisations where id = p_org;
  if v_from is null then return 'Organisation has no current record holder.'; end if;
  if v_from = p_to then return 'That person already holds the record.'; end if;

  if not exists (select 1 from organisation_members where organisation_id = p_org and user_id = p_to) then
    return 'The new holder must be a member of the business.';
  end if;
  if not exists (select 1 from users where id = p_to and phone_verified) then
    return 'The new holder must have a verified phone number.';
  end if;
  if exists (select 1 from client_profiles where user_id = p_to) then
    return 'The new holder already has their own client profile. Remove it first.';
  end if;

  select id into v_profile from client_profiles where user_id = v_from;
  if v_profile is null then
    update organisations set primary_contact_user_id = p_to where id = p_org;
  else
    update client_profiles set user_id = p_to where id = v_profile;
    update reviews set reviewee_id = p_to
      where reviewee_id = v_from and reviewee_type = 'client'
        and job_id in (select id from jobs where client_profile_id = v_profile);
    update reviews set reviewer_id = p_to
      where reviewer_id = v_from and reviewer_type = 'client'
        and job_id in (select id from jobs where client_profile_id = v_profile);
    update pending_invites set inviting_client_id = p_to where inviting_client_id = v_from;
    update organisations set primary_contact_user_id = p_to where id = p_org;
  end if;

  insert into org_record_transfers (organisation_id, from_user_id, to_user_id, done_by, note)
    values (p_org, v_from, p_to, p_admin, p_note);
  return 'ok';
end;
$$;

revoke all on function public.transfer_org_record(uuid, uuid, uuid, text) from public, anon, authenticated;
