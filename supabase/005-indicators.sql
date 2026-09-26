-- =====================================================================
--  MS-7: оценка по индикаторам
--  Выполнить в Supabase → SQL Editor ПОСЛЕ 004-dynamics.sql.
--
--  Методика: каждый мезон оценивается «бир нечта индикаторлар орқали».
--  Балл мезона — среднее его индикаторов, округлённое до целого.
--
--  Семь колонок мезонов остаются и становятся производными, поэтому
--  генерируемый smsi, все представления и старые записи работают без
--  изменений. indicators = null означает прямой ввод балла мезона.
--
--  Согласованность проверяет сама база: сохранить балл мезона, не равный
--  среднему его индикаторов, нельзя даже в обход приложения.
-- =====================================================================

alter table public.evaluations
  add column if not exists indicators jsonb;

comment on column public.evaluations.indicators is
  'Баллы индикаторов: {"legal":[90,85,80,75], ...}. null — балл мезона введён напрямую.';

create or replace function public.criterion_from_indicators(ind jsonb, key text)
returns smallint
language sql
immutable
as $$
  select round(avg(v::numeric))::smallint
  from jsonb_array_elements_text(ind -> key) as v
$$;

create or replace function public.indicators_valid(ind jsonb)
returns boolean
language sql
immutable
as $$
  select jsonb_typeof(ind) = 'object'
     and (
       select bool_and(
         jsonb_typeof(ind -> k) = 'array'
         and jsonb_array_length(ind -> k) > 0
         and (
           select bool_and((v::numeric) between 0 and 100)
           from jsonb_array_elements_text(ind -> k) as v
         )
       )
       from unnest(array[
         'legal', 'quality', 'speed', 'multimedia',
         'interactivity', 'engagement', 'convergence'
       ]) as k
     )
$$;

alter table public.evaluations
  drop constraint if exists evaluations_indicators_consistent;

alter table public.evaluations
  add constraint evaluations_indicators_consistent check (
    indicators is null or (
      public.indicators_valid(indicators)
      and legal         = public.criterion_from_indicators(indicators, 'legal')
      and quality       = public.criterion_from_indicators(indicators, 'quality')
      and speed         = public.criterion_from_indicators(indicators, 'speed')
      and multimedia    = public.criterion_from_indicators(indicators, 'multimedia')
      and interactivity = public.criterion_from_indicators(indicators, 'interactivity')
      and engagement    = public.criterion_from_indicators(indicators, 'engagement')
      and convergence   = public.criterion_from_indicators(indicators, 'convergence')
    )
  );

create or replace view public.media_dynamics as
select
  o.id   as outlet_id,
  o.name,
  o.slug,
  o.ownership,
  o.region,
  o.website,
  e.period,
  e.evaluated_at,
  e.evaluator,
  e.legal, e.quality, e.speed, e.multimedia,
  e.interactivity, e.engagement, e.convergence,
  e.smsi,
  public.smsi_band(e.smsi) as band,
  lag(e.smsi) over (
    partition by e.outlet_id
    order by e.evaluated_at, e.period
  ) as prev_smsi,
  lag(e.period) over (
    partition by e.outlet_id
    order by e.evaluated_at, e.period
  ) as prev_period,
  row_number() over (
    partition by e.outlet_id
    order by e.evaluated_at desc, e.period desc
  ) as recency,
  e.indicators
from public.evaluations e
join public.media_outlets o on o.id = e.outlet_id;

-- Проверка: должна упасть с нарушением evaluations_indicators_consistent,
-- потому что среднее (90+80)/2 = 85, а записано 50.
--
--   update public.evaluations
--   set indicators = '{"legal":[90,80],"quality":[1],"speed":[1],"multimedia":[1],
--                      "interactivity":[1],"engagement":[1],"convergence":[1]}',
--       legal = 50
--   where id = (select id from public.evaluations limit 1);
