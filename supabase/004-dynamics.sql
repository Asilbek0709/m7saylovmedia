-- =====================================================================
--  MS-7: динамика по турам мониторинга
--  Выполнить в Supabase → SQL Editor ПОСЛЕ 002-roles.sql.
--
--  Методика описывает рейтинг в том числе «вақт динамикаси бўйича».
--  До этой миграции рейтинг выбирался без фильтра по периоду: со вторым
--  туром одно издание попадало в таблицу дважды.
--
--  Порядок туров определяется по evaluated_at, а не по тексту period:
--  period — свободная строка и надёжно не сортируется.
-- =====================================================================

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
  ) as recency
from public.evaluations e
join public.media_outlets o on o.id = e.outlet_id;

comment on view public.media_dynamics is
  'Все оценки с предыдущим значением индекса по каждому изданию. recency = 1 — последний тур издания.';

-- Рейтинг последнего тура мониторинга.
create or replace view public.media_latest_rankings as
with latest_period as (
  select period
  from public.evaluations
  group by period
  order by max(evaluated_at) desc, period desc
  limit 1
)
select
  row_number() over (order by d.smsi desc, d.name) as rank,
  d.*
from public.media_dynamics d
join latest_period p on p.period = d.period;

comment on view public.media_latest_rankings is
  'Топ изданий последнего тура. Без этого фильтра рейтинг смешивал туры.';

-- Проверка:
--   select rank, name, period, smsi, prev_smsi from public.media_latest_rankings order by rank;
--   select name, period, evaluated_at, smsi from public.media_dynamics where slug = 'kun-uz' order by evaluated_at;
