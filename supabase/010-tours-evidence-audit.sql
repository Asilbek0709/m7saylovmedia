-- =====================================================================
--  MS-7: туры, обоснования оценок, журнал изменений, права на издания
--  Выполнить в Supabase → SQL Editor ПОСЛЕ 008-admin.sql
--  (009-outlets-seed.sql — данные, порядок с ним не важен).
--
--  1. Издания. Добавлять и править может эксперт, удалять — только
--     администратор. Издание с оценками удалить нельзя вовсе: раньше
--     удаление каскадом стирало оценки всех экспертов, в обход правила
--     «эксперт не трогает чужие оценки».
--
--  2. Туры мониторинга — отдельная таблица. Оценка ссылается на тур по
--     названию, поэтому опечатка больше не создаёт «новый тур», а
--     переименование тура переносится на все его оценки. В закрытом
--     туре оценки нельзя добавить, изменить или удалить — даже прямым
--     запросом; чтобы поправить, администратор открывает тур заново.
--
--  3. Обоснование оценки: короткий комментарий и ссылки по каждому
--     мезону. Закрыто так же, как сама оценка (RLS 007).
--
--  4. Журнал: каждое создание, изменение и удаление оценки записывается
--     автоматически — кто, когда, что было и что стало. Читает только
--     администратор.
-- =====================================================================

-- ---------------------------------------------------------------------
--  1. Издания
-- ---------------------------------------------------------------------

drop policy if exists "approved experts write outlets" on public.media_outlets;

drop policy if exists "experts add outlets" on public.media_outlets;
create policy "experts add outlets"
  on public.media_outlets for insert
  to authenticated
  with check (public.is_expert());

drop policy if exists "experts edit outlets" on public.media_outlets;
create policy "experts edit outlets"
  on public.media_outlets for update
  to authenticated
  using (public.is_expert())
  with check (public.is_expert());

drop policy if exists "admins delete outlets" on public.media_outlets;
create policy "admins delete outlets"
  on public.media_outlets for delete
  to authenticated
  using (public.is_admin());

-- Каскад заменяется запретом: издание с оценками не удаляется.
alter table public.evaluations
  drop constraint if exists evaluations_outlet_id_fkey;
alter table public.evaluations
  add constraint evaluations_outlet_id_fkey
  foreign key (outlet_id) references public.media_outlets (id) on delete restrict;


-- ---------------------------------------------------------------------
--  2. Туры мониторинга
-- ---------------------------------------------------------------------

create table if not exists public.monitoring_periods (
  name        text primary key check (length(trim(name)) > 0),
  starts_on   date,
  ends_on     date,
  status      text not null default 'open' check (status in ('open', 'closed')),
  created_at  timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

comment on table public.monitoring_periods is
  'Туры мониторинга. В закрытом туре оценки не меняются.';

-- Туры, которые уже есть в оценках, — открытыми, чтобы ничего не сломать.
insert into public.monitoring_periods (name, starts_on)
select period, min(evaluated_at)
from public.evaluations
group by period
on conflict (name) do nothing;

alter table public.evaluations
  drop constraint if exists evaluations_period_fkey;
alter table public.evaluations
  add constraint evaluations_period_fkey
  foreign key (period) references public.monitoring_periods (name)
  on update cascade on delete restrict;

create or replace function public.evaluations_period_open()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  closed_period text;
begin
  -- Проверяем и старый тур (изменение/удаление), и новый (вставка/перенос).
  select p.name into closed_period
  from public.monitoring_periods p
  where p.status = 'closed'
    and p.name in (
      case when tg_op in ('UPDATE', 'DELETE') then old.period end,
      case when tg_op in ('INSERT', 'UPDATE') then new.period end
    )
  limit 1;

  -- Переименование тура (on update cascade) меняет только название —
  -- его пропускаем, иначе закрытый тур нельзя было бы переименовать.
  if closed_period is not null
     and not (tg_op = 'UPDATE' and old.period is distinct from new.period
              and (to_jsonb(old) - 'period') = (to_jsonb(new) - 'period')) then
    raise exception 'Тур «%» закрыт: оценки в нём не меняются.', closed_period
      using errcode = 'check_violation';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists evaluations_period_open on public.evaluations;
create trigger evaluations_period_open
  before insert or update or delete on public.evaluations
  for each row execute function public.evaluations_period_open();

alter table public.monitoring_periods enable row level security;

drop policy if exists "periods are publicly readable" on public.monitoring_periods;
create policy "periods are publicly readable"
  on public.monitoring_periods for select
  to anon, authenticated
  using (true);

drop policy if exists "admins manage periods" on public.monitoring_periods;
create policy "admins manage periods"
  on public.monitoring_periods for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ---------------------------------------------------------------------
--  3. Обоснование оценки
-- ---------------------------------------------------------------------

alter table public.evaluations
  add column if not exists evidence jsonb;

comment on column public.evaluations.evidence is
  'Обоснование: {"legal": "комментарий и ссылки", ..., "general": "..."}. Видно эксперту и администратору.';

alter table public.evaluations
  drop constraint if exists evaluations_evidence_object;
alter table public.evaluations
  add constraint evaluations_evidence_object
  check (evidence is null or jsonb_typeof(evidence) = 'object');


-- ---------------------------------------------------------------------
--  4. Журнал изменений оценок
-- ---------------------------------------------------------------------

create table if not exists public.evaluation_audit (
  id             bigserial primary key,
  evaluation_id  uuid not null,
  outlet_id      uuid not null,
  period         text not null,
  evaluator_id   uuid,
  -- Кто сделал изменение: эксперт, администратор или null (SQL Editor).
  actor_id       uuid,
  action         text not null check (action in ('insert', 'update', 'delete')),
  old_data       jsonb,
  new_data       jsonb,
  changed_at     timestamptz not null default now()
);

create index if not exists evaluation_audit_changed_idx
  on public.evaluation_audit (changed_at desc);

comment on table public.evaluation_audit is
  'Журнал изменений оценок. Пишется триггером, читает только администратор.';

create or replace function public.evaluations_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Что сохраняем: баллы, индекс, индикаторы, обоснование, тур, дата.
  keys text[] := array['period', 'evaluated_at', 'legal', 'quality', 'speed',
    'multimedia', 'interactivity', 'engagement', 'convergence', 'smsi',
    'weight_set_id', 'indicators', 'evidence'];
  o jsonb;
  n jsonb;
  row_ public.evaluations;
begin
  if tg_op <> 'INSERT' then
    select jsonb_object_agg(k, to_jsonb(old) -> k) into o from unnest(keys) k;
  end if;
  if tg_op <> 'DELETE' then
    select jsonb_object_agg(k, to_jsonb(new) -> k) into n from unnest(keys) k;
  end if;
  -- Пересохранение без изменений в журнал не пишем.
  if tg_op = 'UPDATE' and o = n then
    return new;
  end if;

  row_ := case when tg_op = 'DELETE' then old else new end;
  insert into public.evaluation_audit
    (evaluation_id, outlet_id, period, evaluator_id, actor_id, action, old_data, new_data)
  values
    (row_.id, row_.outlet_id, row_.period, row_.evaluator_id, auth.uid(),
     lower(tg_op), o, n);
  return null;
end;
$$;

drop trigger if exists evaluations_audit on public.evaluations;
create trigger evaluations_audit
  after insert or update or delete on public.evaluations
  for each row execute function public.evaluations_audit();

alter table public.evaluation_audit enable row level security;

drop policy if exists "admins read audit" on public.evaluation_audit;
create policy "admins read audit"
  on public.evaluation_audit for select
  to authenticated
  using (public.is_admin());

-- Проверка:
--   select name, status from public.monitoring_periods;
--   select action, period, changed_at from public.evaluation_audit order by changed_at desc limit 10;
