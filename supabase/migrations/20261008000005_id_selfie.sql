-- ID check is now two steps: the document (any device) and a live selfie holding a code (phone only).
-- A row with selfie_path null is an incomplete submission and is not shown to admins.
alter table public.verification_documents
  add column if not exists selfie_path text,
  add column if not exists selfie_code text,
  add column if not exists selfie_submitted_at timestamptz;
