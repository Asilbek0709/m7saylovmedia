-- =====================================================================
--  MS-7: версии весов
--  Выполнить в Supabase → SQL Editor ПОСЛЕ 005-indicators.sql.
--
--  До этой миграции веса жили в выражении генерируемой колонки smsi.
--  Изменить их значило пересчитать ВСЕ сохранённые индексы задним
--  числом: уточнили веса после первого тура — история мониторинга
--  молча переписалась.
--
--  Теперь:
--    * наборы весов лежат в weight_sets и не изменяются — только
--      добавляются новые версии;
--    * каждая оценка ссылается на набор, которым она посчитана;
--    * smsi — обычная колонка, её заполняет триггер при сохранении
--      по весам набора этой оценки. Новый набор не трогает старые.
--
--  Набор для новой оценки выбирается по дате оценки: последний
--  набор с valid_from <= evaluated_at. Пересохранение оценки прошлого
--  тура сохраняет её исходный набор.
--
--  Веса в lib/ms7.ts должны совпадать с действующим набором —
--  расхождение приложение показывает на странице методики.
-- =====================================================================

create table if not exists public.weight_sets (
  id             smallint primary key,
  valid_from     date not null unique,
  legal          numeric(4, 3) not null check (legal          between 0 and 1),
  quality        numeric(4, 3) not null check (quality        between 0 and 1),
  speed          numeric(4, 3) not null check (speed          between 0 and 1),
  multimedia     numeric(4, 3) not null check (multimedia     between 0 and 1),
  interactivity  numeric(4, 3) not null check (interactivity  between 0 and 1),
  engagement     numeric(4, 3) not null check (engagement     between 0 and 1),
  convergence    numeric(4, 3) not null check (convergence    between 0 and 1),
  note           text,
  created_at     timestamptz not null default now(),

  constraint weight_sets_sum_to_one check (
    legal + quality + speed + multimedia
    + interactivity + engagement + convergence = 1
  )
);

comment on table public.weight_sets is
  'Версии весов модели MS-7. Не изменяются: новая редакция весов = новая строка.';
comment on column public.weight_sets.id is 'Номер версии: 1, 2, 3…';
comment on column public.weight_sets.valid_from is
  'С этой даты оценки считаются этим набором.';

-- Версия 1 — веса, по которым посчитаны все оценки до этой миграции.
-- Дата — не позже самой ранней оценки и не позже начала 2026 года:
-- набор должен покрыть все оценки, в том числе если миграцию
-- выполнили на пустой базе после 003-clear-demo-data.sql.
insert into public.weight_sets
  (id, valid_from, legal, quality, speed, multimedia,
   interactivity, engagement, convergence, note)
select 1,
       least(coalesce(min(e.evaluated_at), current_date), date '2026-01-01'),
       0.18, 0.18, 0.14, 0.12, 0.12, 0.14, 0.12,
       'Исходные веса модели MS-7.'
from public.evaluations e
on conflict (id) do nothing;


-- Набор весов неизменяем даже для администратора базы: иначе правка
-- «опечатки» в весах тихо разойдётся с уже сохранёнными индексами.
create or replace function public.weight_sets_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'Набор весов % нельзя изменить или удалить. Добавьте новую версию.',
    old.id
    using errcode = 'check_violation';
end;
$$;

drop trigger if exists weight_sets_no_update on public.weight_sets;
create trigger weight_sets_no_update
  before update or delete on public.weight_sets
  for each row execute function public.weight_sets_immutable();


-- ---------------------------------------------------------------------
--  Оценки: ссылка на набор и индекс, зафиксированный при сохранении
-- ---------------------------------------------------------------------

alter table public.evaluations
  add column if not exists weight_set_id smallint
    references public.weight_sets (id);

comment on column public.evaluations.weight_set_id is
  'Набор весов, которым посчитан smsi этой оценки.';

-- smsi перестаёт вычисляться от констант. Значения сохраняются.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'evaluations'
      and column_name  = 'smsi'
      and is_generated = 'ALWAYS'
  ) then
    alter table public.evaluations alter column smsi drop expression;
  end if;
end;
$$;

comment on column public.evaluations.smsi is
  'SMSI 0–100. Считается триггером при сохранении по набору weight_set_id и дальше не меняется.';

create or replace function public.evaluations_apply_weights()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  w public.weight_sets;
begin
  if new.weight_set_id is null then
    select * into w
    from public.weight_sets
    where valid_from <= new.evaluated_at
    order by valid_from desc
    limit 1;

    if not found then
      raise exception
        'Нет набора весов, действующего на %.', new.evaluated_at
        using errcode = 'check_violation';
    end if;

    new.weight_set_id := w.id;
  else
    select * into strict w
    from public.weight_sets
    where id = new.weight_set_id;
  end if;

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

drop trigger if exists evaluations_apply_weights on public.evaluations;
create trigger evaluations_apply_weights
  before insert or update on public.evaluations
  for each row execute function public.evaluations_apply_weights();

-- Все существующие оценки — версия 1. Триггер пересчитает smsi теми же
-- весами, так что значения не изменятся (проверка — в конце файла).
update public.evaluations
set weight_set_id = 1
where weight_set_id is null;

alter table public.evaluations
  alter column weight_set_id set not null;


-- ---------------------------------------------------------------------
--  Права
-- ---------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

alter table public.weight_sets enable row level security;

drop policy if exists "weight sets are publicly readable" on public.weight_sets;
create policy "weight sets are publicly readable"
  on public.weight_sets for select
  to anon, authenticated
  using (true);

drop policy if exists "admins add weight sets" on public.weight_sets;
create policy "admins add weight sets"
  on public.weight_sets for insert
  to authenticated
  with check (public.is_admin());


-- ---------------------------------------------------------------------
--  Представления: версия весов рядом с каждой оценкой
-- ---------------------------------------------------------------------

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
  e.indicators,
  e.weight_set_id
from public.evaluations e
join public.media_outlets o on o.id = e.outlet_id;

-- d.* раскрывается при создании представления — пересоздаём, чтобы
-- новая колонка попала и в рейтинг последнего тура.
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


-- ---------------------------------------------------------------------
--  Проверка
-- ---------------------------------------------------------------------
--
--  1. Индексы не изменились — должно вернуть 0 строк:
--
--     select id, smsi from public.evaluations
--     where smsi <> round(( legal * 0.18 + quality * 0.18 + speed * 0.14
--                         + multimedia * 0.12 + interactivity * 0.12
--                         + engagement * 0.14 + convergence * 0.12)::numeric, 1);
--
--  2. Новая версия весов не трогает старые оценки:
--
--     begin;
--     insert into public.weight_sets
--       (id, valid_from, legal, quality, speed, multimedia,
--        interactivity, engagement, convergence, note)
--     values (2, current_date + 1, 0.20, 0.20, 0.12, 0.12, 0.12, 0.12, 0.12, 'тест');
--     select count(*) from public.evaluations where weight_set_id = 2;  -- 0
--     rollback;
--
--  3. Набор нельзя изменить — должно упасть:
--
--     update public.weight_sets set legal = 0.20 where id = 1;
