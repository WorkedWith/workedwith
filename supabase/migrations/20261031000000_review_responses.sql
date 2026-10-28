-- Review responses: 300 characters, one per review, permanent.
alter table public.reviews
  add constraint reviews_response_length check (response_text is null or char_length(response_text) between 1 and 300);

create or replace function public.reviews_lock_response() returns trigger
language plpgsql as $$
begin
  if old.response_text is not null
     and (new.response_text is distinct from old.response_text
          or new.response_submitted_at is distinct from old.response_submitted_at) then
    raise exception 'A review response cannot be changed once posted';
  end if;
  return new;
end;
$$;

drop trigger if exists reviews_lock_response_trg on public.reviews;
create trigger reviews_lock_response_trg
  before update on public.reviews
  for each row execute function public.reviews_lock_response();
