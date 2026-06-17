-- Add 'job_invite' notification type for when a tradesperson logs a job
-- and the client receives an in-app notification to confirm it.
alter table public.notifications drop constraint if exists notifications_type_check;

alter table public.notifications add constraint notifications_type_check
  check (type in (
    'new_review', 'review_response', 'dispute_raised', 'dispute_evidence_due',
    'dispute_resolved', 'invite_accepted', 'job_confirmed', 'review_window_opened',
    'review_reminder', 'reviews_published', 'id_verified', 'id_rejected',
    'subscription_updated', 'red_flag_received', 'job_invite'
  ));
