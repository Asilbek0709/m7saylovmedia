-- =====================================================================
--  MS-7: Saylov-Media — схема базы данных (Supabase / PostgreSQL)
--  Выполнить в Supabase → SQL Editor → New query → Run.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. Справочник цифровых СМИ
-- ---------------------------------------------------------------------
create table if not exists public.media_outlets (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  website     text,
  -- давлат = государственное, нодавлат = негосударственное
  ownership   text not null default 'nodavlat'
              check (ownership in ('davlat', 'nodavlat')),
  region      text not null default 'Тошкент',
  logo_url    text,
  created_at  timestamptz not null default now()
);

comment on table  public.media_outlets is 'Рақамли ОАВ рўйхати — объекты мониторинга MS-7.';
comment on column public.media_outlets.ownership is 'Форма собственности: davlat / nodavlat.';

-- ---------------------------------------------------------------------
-- 2. Оценки по модели MS-7
--    Семь критериев, шкала 0–100. SMSI считается базой как generated
--    column, поэтому индекс невозможно рассогласовать с баллами.
-- ---------------------------------------------------------------------
create table if not exists public.evaluations (
  id             uuid primary key default gen_random_uuid(),
  outlet_id      uuid not null references public.media_outlets (id) on delete cascade,

  -- Период мониторинга, напр. 'Сайлов-2026, 1-босқич'
  period         text not null,
  evaluator      text,

  -- 1. Ҳуқуқий мувофиқлик
  legal          smallint not null check (legal          between 0 and 100),
  -- 2. Ахборот сифати
  quality        smallint not null check (quality        between 0 and 100),
  -- 3. Тезкорлик
  speed          smallint not null check (speed          between 0 and 100),
  -- 4. Мультимедиалилик
  multimedia     smallint not null check (multimedia     between 0 and 100),
  -- 5. Интерактивлик
  interactivity  smallint not null check (interactivity  between 0 and 100),
  -- 6. Аудитория фаоллиги
  engagement     smallint not null check (engagement     between 0 and 100),
  -- 7. Медиаконвергенция
  convergence    smallint not null check (convergence    between 0 and 100),

  -- Интегральный индекс SMSI: взвешенная сумма (веса модели MS-7, сумма = 1.00)
  smsi numeric(4, 1) generated always as (
    round(
      ( legal         * 0.18
      + quality       * 0.18
      + speed         * 0.14
      + multimedia    * 0.12
      + interactivity * 0.12
      + engagement    * 0.14
      + convergence   * 0.12
      )::numeric, 1)
  ) stored,

  evaluated_at   date not null default current_date,
  created_at     timestamptz not null default now(),

  unique (outlet_id, period)
);

create index if not exists evaluations_outlet_idx on public.evaluations (outlet_id);
create index if not exists evaluations_smsi_idx   on public.evaluations (smsi desc);
create index if not exists evaluations_period_idx on public.evaluations (period);

comment on column public.evaluations.smsi is
  'SMSI — интегральный индекс 0–100, вычисляется базой по весам модели MS-7.';

-- ---------------------------------------------------------------------
-- 3. Уровень (даража) по шкале интерпретации SMSI
-- ---------------------------------------------------------------------
create or replace function public.smsi_band(score numeric)
returns text
language sql
immutable
as $$
  select case
    when score >= 90 then 'veryhigh'   -- Жуда юқори
    when score >= 75 then 'high'       -- Юқори
    when score >= 60 then 'moderate'   -- Ўртача
    when score >= 45 then 'poor'       -- Қониқарсиз
    else                  'critical'   -- Инқирозли
  end;
$$;

-- ---------------------------------------------------------------------
-- 4. Готовый рейтинг для дашборда
-- ---------------------------------------------------------------------
create or replace view public.media_rankings as
select
  row_number() over (partition by e.period order by e.smsi desc, o.name) as rank,
  o.id            as outlet_id,
  o.name,
  o.slug,
  o.ownership,
  o.region,
  o.website,
  e.period,
  e.legal, e.quality, e.speed, e.multimedia,
  e.interactivity, e.engagement, e.convergence,
  e.smsi,
  public.smsi_band(e.smsi) as band,
  e.evaluated_at
from public.evaluations e
join public.media_outlets o on o.id = e.outlet_id;

-- ---------------------------------------------------------------------
-- 5. Row Level Security
--    Рейтинг публичен, изменять оценки может только вошедший эксперт.
-- ---------------------------------------------------------------------
alter table public.media_outlets enable row level security;
alter table public.evaluations   enable row level security;

drop policy if exists "outlets are publicly readable" on public.media_outlets;
create policy "outlets are publicly readable"
  on public.media_outlets for select
  to anon, authenticated
  using (true);

drop policy if exists "evaluations are publicly readable" on public.evaluations;
create policy "evaluations are publicly readable"
  on public.evaluations for select
  to anon, authenticated
  using (true);

drop policy if exists "experts manage outlets" on public.media_outlets;
create policy "experts manage outlets"
  on public.media_outlets for all
  to authenticated
  using (true) with check (true);

drop policy if exists "experts manage evaluations" on public.evaluations;
create policy "experts manage evaluations"
  on public.evaluations for all
  to authenticated
  using (true) with check (true);

-- =====================================================================
--  ДЕМО-ДАННЫЕ
--  ВНИМАНИЕ: баллы ниже — иллюстративные, сгенерированы для показа
--  интерфейса. Это НЕ результат реального мониторинга и не может
--  использоваться как оценка перечисленных изданий.
-- =====================================================================
insert into public.media_outlets (name, slug, website, ownership, region) values
  ('Kun.uz',            'kun-uz',      'kun.uz',       'nodavlat', 'Тошкент'),
  ('Gazeta.uz',         'gazeta-uz',   'gazeta.uz',    'nodavlat', 'Тошкент'),
  ('Daryo.uz',          'daryo-uz',    'daryo.uz',     'nodavlat', 'Тошкент'),
  ('UzA — Ўзбекистон МА','uza',        'uza.uz',       'davlat',   'Тошкент'),
  ('Qalampir.uz',       'qalampir-uz', 'qalampir.uz',  'nodavlat', 'Тошкент'),
  ('Xabar.uz',          'xabar-uz',    'xabar.uz',     'davlat',   'Тошкент'),
  ('Repost.uz',         'repost-uz',   'repost.uz',    'nodavlat', 'Тошкент'),
  ('Podrobno.uz',       'podrobno-uz', 'podrobno.uz',  'nodavlat', 'Тошкент'),
  ('Yuz.uz',            'yuz-uz',      'yuz.uz',       'davlat',   'Тошкент'),
  ('Anhor.uz',          'anhor-uz',    'anhor.uz',     'nodavlat', 'Тошкент')
on conflict (slug) do nothing;

insert into public.evaluations
  (outlet_id, period, evaluator, legal, quality, speed, multimedia, interactivity, engagement, convergence)
select o.id, 'Сайлов-2026, 1-босқич', 'ДЕМО (иллюстративные данные)', v.legal, v.quality, v.speed,
       v.multimedia, v.interactivity, v.engagement, v.convergence
from (values
  ('kun-uz',      94, 91, 95, 90, 88, 96, 93),
  ('gazeta-uz',   93, 95, 88, 89, 85, 90, 88),
  ('daryo-uz',    88, 86, 91, 87, 86, 92, 89),
  ('uza',         92, 88, 79, 76, 62, 71, 80),
  ('qalampir-uz', 79, 78, 88, 85, 84, 89, 86),
  ('xabar-uz',    86, 82, 78, 74, 66, 70, 75),
  ('repost-uz',   76, 74, 79, 81, 80, 78, 77),
  ('podrobno-uz', 81, 79, 76, 70, 68, 72, 71),
  ('yuz-uz',      78, 73, 68, 64, 58, 61, 66),
  ('anhor-uz',    72, 75, 66, 61, 63, 59, 60)
) as v(slug, legal, quality, speed, multimedia, interactivity, engagement, convergence)
join public.media_outlets o on o.slug = v.slug
on conflict (outlet_id, period) do nothing;

-- Проверка: select rank, name, smsi, band from public.media_rankings order by rank;
