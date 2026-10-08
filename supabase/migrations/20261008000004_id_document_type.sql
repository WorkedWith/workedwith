-- ID can be a driving licence or a passport. The number is only ever stored as a keyed hash
-- (users.licence_number_hash, kept under its existing name), written when an admin approves.
alter table public.verification_documents
  add column if not exists document_type text not null default 'driving_licence'
  check (document_type in ('driving_licence', 'passport'));
