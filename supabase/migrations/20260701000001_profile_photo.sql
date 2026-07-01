alter table public.users add column if not exists profile_photo_url text;

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

create policy "users can upload own profile photo"
  on storage.objects for insert
  with check (bucket_id = 'profile-photos' and auth.role() = 'authenticated');

create policy "public can view profile photos"
  on storage.objects for select
  using (bucket_id = 'profile-photos');
