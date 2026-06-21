insert into storage.buckets (id, name, public)
values ('verification-documents', 'verification-documents', false)
on conflict (id) do nothing;

create policy "users can upload own verification docs"
  on storage.objects for insert
  with check (bucket_id = 'verification-documents' and auth.role() = 'authenticated');

create policy "service role can read verification docs"
  on storage.objects for select
  using (bucket_id = 'verification-documents' and auth.role() = 'service_role');
