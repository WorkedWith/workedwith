-- Account deletion: make every foreign key to public.users deletable.
--
-- Problem: many FKs to public.users were created with the default NO ACTION,
-- so deleting a user (auth.admin.deleteUser) fails once they have any activity.
--
-- Rules applied to every FK that references public.users and is still NO ACTION:
--   * Reviews and disputes: SET NULL (drop NOT NULL first). The row and its ratings
--     are kept, only the link to the person goes. Reviews therefore stay as the
--     anonymised rating signal required by the Key Rules.
--   * Admin/reviewer pointers and log tables (reviewed_by, claimed_by_user_id,
--     searcher_id, viewer_id, deactivated_by, owner_id, invited_by on memberships):
--     SET NULL. The record survives, the person reference goes.
--   * Any other NOT NULL personal column (verification_documents.user_id,
--     job_invites.inviter_id, organisation_invites.invited_by, notifications.user_id):
--     CASCADE. These are only meaningful for that person.
--   * Any other nullable column: SET NULL.
--
-- Idempotent: only touches constraints currently on NO ACTION (confdeltype = 'a').

do $$
declare
  r record;
  action text;
  keep_row_cols text[] := array[
    'reviews.reviewer_id', 'reviews.reviewee_id',
    'disputes.raised_by', 'disputes.respondent_id', 'disputes.admin_decision_by'
  ];
begin
  for r in
    select
      c.conname,
      cl.relname as tbl,
      a.attname  as col,
      a.attnotnull as notnull
    from pg_constraint c
    join pg_class cl on cl.oid = c.conrelid
    join pg_namespace n on n.oid = cl.relnamespace
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f'
      and c.confrelid = 'public.users'::regclass
      and c.confdeltype = 'a'
      and n.nspname = 'public'
      and array_length(c.conkey, 1) = 1
  loop
    if (r.tbl || '.' || r.col) = any (keep_row_cols) then
      action := 'set null';
      if r.notnull then
        execute format('alter table public.%I alter column %I drop not null', r.tbl, r.col);
      end if;
    elsif r.notnull then
      action := 'cascade';
    else
      action := 'set null';
    end if;

    execute format('alter table public.%I drop constraint %I', r.tbl, r.conname);
    execute format(
      'alter table public.%I add constraint %I foreign key (%I) references public.users (id) on delete %s',
      r.tbl, r.conname, r.col, action
    );
    raise notice '%.% -> on delete %', r.tbl, r.col, action;
  end loop;
end $$;
