-- A trade can now decline a job request from a client.
ALTER TABLE public.pending_invites DROP CONSTRAINT IF EXISTS pending_invites_status_check;
ALTER TABLE public.pending_invites
  ADD CONSTRAINT pending_invites_status_check
  CHECK (status IN ('sent', 'expired', 'claimed', 'disputed', 'declined'));
