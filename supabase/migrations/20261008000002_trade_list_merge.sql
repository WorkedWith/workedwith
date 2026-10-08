-- Merge duplicate trade names: General Builder -> Builder, Decorator -> Painter and Decorator.
update public.trade_profiles
set trade_types = (
  select coalesce(array_agg(v order by first_pos), '{}')
  from (
    select v, min(pos) as first_pos
    from unnest(
      array_replace(array_replace(trade_types, 'General Builder', 'Builder'), 'Decorator', 'Painter and Decorator')
    ) with ordinality as t(v, pos)
    group by v
  ) s
)
where trade_types && array['General Builder', 'Decorator'];

update public.jobs
set job_type = case job_type when 'General Builder' then 'Builder' else 'Painter and Decorator' end
where job_type in ('General Builder', 'Decorator');

update public.pending_invites
set job_type = case job_type when 'General Builder' then 'Builder' else 'Painter and Decorator' end
where job_type in ('General Builder', 'Decorator');

update public.seeded_profiles
set trade_category = case trade_category when 'General Builder' then 'Builder' else 'Painter and Decorator' end
where trade_category in ('General Builder', 'Decorator');
