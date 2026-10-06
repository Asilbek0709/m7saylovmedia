-- =====================================================================
--  MS-7: несколько экспертов на издание и тур
--  Выполнить в Supabase → SQL Editor ПОСЛЕ 006-weight-sets.sql.
--
--  До этой миграции уникальность (outlet_id, period) означала: второй
--  эксперт, оценивший то же издание в том же туре, молча перезаписывал
--  первого. Теперь:
--
--    * у каждого эксперта своя строка: (outlet_id, period, evaluator_id);
--    * эксперт — ссылка на профиль пользователя, а не текст;
--    * итог тура — среднее экспертов по каждому мезону, SMSI считается
--      от средних весами набора этого тура;
--    * публикуется только агрегат и разброс. Индивидуальные оценки видит
--      сам эксперт и администратор — так принято в экспертных методиках;
--    * эксперт меняет только свою строку — это проверяет база (RLS),
--      а не приложение.
--
--  Согласованность экспертов: число экспертов, стандартное отклонение
--  и размах по SMSI и каждому мезону; при размахе SMSI больше 5 баллов
--  издание помечается «требует согласования». По туру — коэффициент
--  конкордации Кендалла W (представление period_agreement).
--
--  Публичные представления читают таблицу с правами владельца и поэтому
--  видят все строки — это намеренно: наружу отдаётся только агрегат.
-- =====================================================================

-- ---------------------------------------------------------------------
--  Эксперт — ссылка на профиль
-- ---------------------------------------------------------------------

-- Без on delete: удалить аккаунт эксперта, у которого есть оценки,
-- нельзя — иначе вместе с ним тихо пропадёт часть данных мониторинга.
alter table public.evaluations
  add column if not exists evaluator_id uuid
    references public.profiles (id)
    default auth.uid();

comment on column public.evaluations.evaluator_id is
  'Эксперт, выставивший оценку. null — записи до 007 без сопоставленного профиля (демо).';
comment on column public.evaluations.evaluator is
  'Устарело: email эксперта текстом. Эксперт — evaluator_id.';

-- Старые записи хранили email эксперта текстом — сопоставляем с профилями.
update public.evaluations e
set evaluator_id = p.id
from public.profiles p
where e.evaluator_id is null
  and p.email is not null
  and lower(p.email) = lower(e.evaluator);

create index if not exists evaluations_evaluator_idx
  on public.evaluations (evaluator_id);


-- ---------------------------------------------------------------------
--  Уникальность: одна строка на эксперта
-- ---------------------------------------------------------------------

-- Имя старого ограничения назначила база — ищем его по составу колонок.
do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.evaluations'::regclass
      and con.contype = 'u'
      and (
        select array_agg(att.attname::text order by att.attname)
        from unnest(con.conkey) as k(attnum)
        join pg_attribute att
          on att.attrelid = con.conrelid and att.attnum = k.attnum
      ) = array['outlet_id', 'period']
  loop
    execute format('alter table public.evaluations drop constraint %I', c.conname);
  end loop;
end;
$$;

-- nulls not distinct: записи без эксперта (демо) по-прежнему одна на тур.
alter table public.evaluations
  drop constraint if exists evaluations_outlet_period_evaluator_key;
alter table public.evaluations
  add constraint evaluations_outlet_period_evaluator_key
  unique nulls not distinct (outlet_id, period, evaluator_id);


-- ---------------------------------------------------------------------
--  Один набор весов на тур издания
-- ---------------------------------------------------------------------
--
--  Итог тура считается от средних одним набором весов. Если эксперты
--  оценивали в разные дни по разные стороны valid_from, они получили бы
--  разные наборы. Поэтому новая оценка берёт набор уже существующих
--  оценок того же издания и тура, а по дате — только первая из них.
--
--  security definer: эксперт не видит чужих строк (RLS ниже), а триггеру
--  нужно найти набор соседних оценок.

create or replace function public.evaluations_apply_weights()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  w public.weight_sets;
  sibling smallint;
begin
  if new.weight_set_id is null then
    select e.weight_set_id into sibling
    from public.evaluations e
    where e.outlet_id = new.outlet_id
      and e.period    = new.period
      and e.id       <> new.id
    limit 1;

    if sibling is not null then
      new.weight_set_id := sibling;
    else
      select ws.id into new.weight_set_id
      from public.weight_sets ws
      where ws.valid_from <= new.evaluated_at
      order by ws.valid_from desc
      limit 1;

      if new.weight_set_id is null then
        raise exception
          'Нет набора весов, действующего на %.', new.evaluated_at
          using errcode = 'check_violation';
      end if;
    end if;
  end if;

  select * into strict w
  from public.weight_sets
  where id = new.weight_set_id;

  -- Индекс всегда пересчитывается из баллов и весов своего набора:
  -- записать произвольный smsi в обход модели нельзя.
  new.smsi := round(
      new.legal         * w.legal
    + new.quality       * w.quality
    + new.speed         * w.speed
    + new.multimedia    * w.multimedia
    + new.interactivity * w.interactivity
    + new.engagement    * w.engagement
    + new.convergence   * w.convergence
  , 1);

  return new;
end;
$$;


-- ---------------------------------------------------------------------
--  Права: индивидуальные оценки закрыты, свою строку меняет только автор
-- ---------------------------------------------------------------------

drop policy if exists "evaluations are publicly readable" on public.evaluations;
drop policy if exists "experts manage evaluations" on public.evaluations;
drop policy if exists "approved experts write evaluations" on public.evaluations;

drop policy if exists "experts read own evaluations" on public.evaluations;
create policy "experts read own evaluations"
  on public.evaluations for select
  to authenticated
  using (evaluator_id = (select auth.uid()) or public.is_admin());

drop policy if exists "experts insert own evaluations" on public.evaluations;
create policy "experts insert own evaluations"
  on public.evaluations for insert
  to authenticated
  with check (
    public.is_expert()
    and (evaluator_id = (select auth.uid()) or public.is_admin())
  );

drop policy if exists "experts update own evaluations" on public.evaluations;
create policy "experts update own evaluations"
  on public.evaluations for update
  to authenticated
  using (
    public.is_expert()
    and (evaluator_id = (select auth.uid()) or public.is_admin())
  )
  with check (
    public.is_expert()
    and (evaluator_id = (select auth.uid()) or public.is_admin())
  );

drop policy if exists "experts delete own evaluations" on public.evaluations;
create policy "experts delete own evaluations"
  on public.evaluations for delete
  to authenticated
  using (
    public.is_expert()
    and (evaluator_id = (select auth.uid()) or public.is_admin())
  );


-- ---------------------------------------------------------------------
--  Итог тура: среднее экспертов и разброс
-- ---------------------------------------------------------------------

-- Сначала зависимые: media_rankings и рейтинг тура читают media_dynamics.
drop view if exists public.media_rankings;
drop view if exists public.media_latest_rankings;
drop view if exists public.media_dynamics;
drop view if exists public.period_agreement;
drop view if exists public.evaluation_rounds;

create view public.evaluation_rounds as
with agg as (
  select
    e.outlet_id,
    e.period,
    max(e.evaluated_at)  as evaluated_at,
    max(e.weight_set_id) as weight_set_id,
    count(*)::int        as experts,

    avg(e.legal)         as legal_avg,
    avg(e.quality)       as quality_avg,
    avg(e.speed)         as speed_avg,
    avg(e.multimedia)    as multimedia_avg,
    avg(e.interactivity) as interactivity_avg,
    avg(e.engagement)    as engagement_avg,
    avg(e.convergence)   as convergence_avg,

    round(stddev_samp(e.smsi), 1)  as smsi_sd,
    max(e.smsi) - min(e.smsi)      as smsi_range,

    jsonb_build_object(
      'legal',         jsonb_build_object('sd', round(stddev_samp(e.legal), 1),         'range', max(e.legal)         - min(e.legal)),
      'quality',       jsonb_build_object('sd', round(stddev_samp(e.quality), 1),       'range', max(e.quality)       - min(e.quality)),
      'speed',         jsonb_build_object('sd', round(stddev_samp(e.speed), 1),         'range', max(e.speed)         - min(e.speed)),
      'multimedia',    jsonb_build_object('sd', round(stddev_samp(e.multimedia), 1),    'range', max(e.multimedia)    - min(e.multimedia)),
      'interactivity', jsonb_build_object('sd', round(stddev_samp(e.interactivity), 1), 'range', max(e.interactivity) - min(e.interactivity)),
      'engagement',    jsonb_build_object('sd', round(stddev_samp(e.engagement), 1),    'range', max(e.engagement)    - min(e.engagement)),
      'convergence',   jsonb_build_object('sd', round(stddev_samp(e.convergence), 1),   'range', max(e.convergence)   - min(e.convergence))
    ) as criteria_spread
  from public.evaluations e
  group by e.outlet_id, e.period
)
select
  a.outlet_id,
  a.period,
  a.evaluated_at,
  a.weight_set_id,
  a.experts,
  round(a.legal_avg, 1)         as legal,
  round(a.quality_avg, 1)       as quality,
  round(a.speed_avg, 1)         as speed,
  round(a.multimedia_avg, 1)    as multimedia,
  round(a.interactivity_avg, 1) as interactivity,
  round(a.engagement_avg, 1)    as engagement,
  round(a.convergence_avg, 1)   as convergence,
  -- SMSI от неокруглённых средних — с одним экспертом совпадает с его индексом.
  round(
      a.legal_avg         * w.legal
    + a.quality_avg       * w.quality
    + a.speed_avg         * w.speed
    + a.multimedia_avg    * w.multimedia
    + a.interactivity_avg * w.interactivity
    + a.engagement_avg    * w.engagement
    + a.convergence_avg   * w.convergence
  , 1) as smsi,
  a.smsi_sd,
  a.smsi_range,
  a.criteria_spread,
  a.smsi_range > 5 as needs_consensus
from agg a
join public.weight_sets w on w.id = a.weight_set_id;

comment on view public.evaluation_rounds is
  'Итог тура по изданию: средние экспертов, SMSI от средних, разброс. Индивидуальные оценки наружу не выходят.';
comment on column public.evaluation_rounds.needs_consensus is
  'Размах SMSI между экспертами больше 5 баллов — оценки требуют согласования.';


create view public.media_dynamics as
select
  o.id   as outlet_id,
  o.name,
  o.slug,
  o.ownership,
  o.region,
  o.website,
  r.period,
  r.evaluated_at,
  r.legal, r.quality, r.speed, r.multimedia,
  r.interactivity, r.engagement, r.convergence,
  r.smsi,
  public.smsi_band(r.smsi) as band,
  lag(r.smsi) over (
    partition by r.outlet_id
    order by r.evaluated_at, r.period
  ) as prev_smsi,
  lag(r.period) over (
    partition by r.outlet_id
    order by r.evaluated_at, r.period
  ) as prev_period,
  row_number() over (
    partition by r.outlet_id
    order by r.evaluated_at desc, r.period desc
  ) as recency,
  r.weight_set_id,
  r.experts,
  r.smsi_sd,
  r.smsi_range,
  r.criteria_spread,
  r.needs_consensus
from public.evaluation_rounds r
join public.media_outlets o on o.id = r.outlet_id;

comment on view public.media_dynamics is
  'Итоги туров по изданиям с предыдущим значением индекса. recency = 1 — последний тур издания.';


create view public.media_latest_rankings as
with latest_period as (
  select period
  from public.evaluation_rounds
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
  'Рейтинг последнего тура по итогам экспертов.';


-- Прежнее представление из schema.sql читало таблицу напрямую и отдало бы
-- индивидуальные оценки — пересобрано поверх итогов тура.
create view public.media_rankings as
select
  row_number() over (partition by d.period order by d.smsi desc, d.name) as rank,
  d.outlet_id, d.name, d.slug, d.ownership, d.region, d.website, d.period,
  d.legal, d.quality, d.speed, d.multimedia,
  d.interactivity, d.engagement, d.convergence,
  d.smsi, d.band, d.evaluated_at
from public.media_dynamics d;


-- ---------------------------------------------------------------------
--  Коэффициент конкордации Кендалла по туру
-- ---------------------------------------------------------------------
--
--  Каждый эксперт ранжирует издания тура по своему SMSI. Считается по
--  изданиям, которые оценили ВСЕ эксперты тура. Связанные ранги —
--  средние, с поправкой на связи:
--
--    W = 12·S / (m²·(n³ − n) − m·ΣT),   T = Σ(t³ − t) по группам связей,
--    S = Σ(Rᵢ − R̄)²,  Rᵢ — сумма рангов издания i.
--
--  Значимость: χ² = m·(n − 1)·W, степеней свободы n − 1.
--  W не определён при m < 2 или n < 2 — тогда null, показывается разброс.

create view public.period_agreement as
with r as (
  select
    period,
    outlet_id,
    coalesce(evaluator_id::text, 'legacy') as expert,
    smsi
  from public.evaluations
),
panel as (
  select period, count(distinct expert)::int as m
  from r
  group by period
),
common as (
  select r.period, r.outlet_id
  from r
  join panel p using (period)
  group by r.period, r.outlet_id, p.m
  having count(distinct r.expert) = p.m
),
cr as (
  select r.*
  from r
  join common using (period, outlet_id)
),
ranked as (
  select
    period,
    outlet_id,
    rank() over (partition by period, expert order by smsi)
      + (count(*) over (partition by period, expert, smsi) - 1) / 2.0 as rk
  from cr
),
sums as (
  select period, outlet_id, sum(rk) as rsum
  from ranked
  group by period, outlet_id
),
stats as (
  select
    period,
    count(*)::int as n,
    sum(rsum * rsum) - sum(rsum) * sum(rsum) / count(*) as s
  from sums
  group by period
),
ties as (
  select period, sum(t * t * t - t) as t_sum
  from (
    select period, expert, smsi, count(*) as t
    from cr
    group by period, expert, smsi
  ) g
  group by period
),
w as (
  select
    p.period,
    p.m,
    coalesce(st.n, 0) as n,
    case
      when p.m >= 2 and st.n >= 2
       and (p.m * p.m * (st.n ^ 3 - st.n) - p.m * coalesce(t.t_sum, 0)) > 0
      then 12 * st.s
         / (p.m * p.m * (st.n ^ 3 - st.n) - p.m * coalesce(t.t_sum, 0))
    end as w
  from panel p
  left join stats st using (period)
  left join ties  t  using (period)
)
select
  period,
  m                                    as experts,
  n                                    as outlets,
  round(w::numeric, 3)                 as kendall_w,
  round((m * (n - 1) * w)::numeric, 2) as chi2,
  case when w is not null then n - 1 end as df
from w;

comment on view public.period_agreement is
  'Согласованность экспертов тура: W Кендалла по изданиям, оценённым всеми экспертами; χ² и степени свободы для проверки значимости.';


-- ---------------------------------------------------------------------
--  Проверка
-- ---------------------------------------------------------------------
--
--  Итоги тура:
--    select name, period, experts, smsi, smsi_range, needs_consensus
--    from public.media_latest_rankings order by rank;
--
--  Согласованность:
--    select * from public.period_agreement;
--
--  Аноним не видит индивидуальных оценок — должно вернуть 0 строк:
--    set role anon; select count(*) from public.evaluations; reset role;
