-- =====================================================================
--  MS-7: роли экспертов и подтверждение регистрации
--  Выполнить в Supabase → SQL Editor ПОСЛЕ schema.sql.
--
--  Зачем: до этой миграции политика записи была `using (true)` — любой
--  вошедший пользователь мог переписать любую оценку. С открытой
--  регистрацией это означало бы, что рейтинг может править кто угодно.
--  Теперь право записи даёт роль, а не сам факт регистрации.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Профили пользователей
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  organization text,
  -- pending — зарегистрировался, но писать не может;
  -- expert  — подтверждён, может вносить оценки и издания;
  -- admin   — дополнительно подтверждает других.
  role        text not null default 'pending'
              check (role in ('pending', 'expert', 'admin')),
  created_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Профили с ролями. Новая регистрация = pending: читать можно всё, писать — ничего.';

-- ---------------------------------------------------------------------
-- 2. Профиль создаётся автоматически при регистрации
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, organization)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'organization', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 3. Кто имеет право писать
--    security definer — чтобы политика могла прочитать profiles,
--    не упираясь в её собственный RLS (иначе рекурсия).
-- ---------------------------------------------------------------------
create or replace function public.is_expert()
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
      and role in ('expert', 'admin')
  );
$$;

-- ---------------------------------------------------------------------
-- 4. Существующие аккаунты заводились вручную администратором —
--    считаем их подтверждёнными экспертами.
--
--    `do nothing`, а не `do update`: миграцию могут прогнать повторно при
--    переразвёртывании, и перезапись роли вернула бы права всем, кого
--    администратор до этого понизил.
-- ---------------------------------------------------------------------
insert into public.profiles (id, email, role)
select u.id, u.email, 'expert'
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "own profile readable" on public.profiles;
create policy "own profile readable"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

-- Политики на UPDATE/INSERT для profiles намеренно нет: менять профиль из
-- приложения пока негде, а без неё пользователь физически не может повысить
-- себе роль. Профили создаёт триггер (security definer), роли меняет
-- администратор в SQL Editor — service role обходит RLS.
drop policy if exists "own profile updatable" on public.profiles;

-- Запись оценок и изданий — только подтверждённым экспертам.
drop policy if exists "experts manage evaluations" on public.evaluations;
drop policy if exists "approved experts write evaluations" on public.evaluations;
create policy "approved experts write evaluations"
  on public.evaluations for all
  to authenticated
  using (public.is_expert())
  with check (public.is_expert());

drop policy if exists "experts manage outlets" on public.media_outlets;
drop policy if exists "approved experts write outlets" on public.media_outlets;
create policy "approved experts write outlets"
  on public.media_outlets for all
  to authenticated
  using (public.is_expert())
  with check (public.is_expert());

-- ---------------------------------------------------------------------
-- 6. Итог: кто и с какой ролью заведён
-- ---------------------------------------------------------------------
select email, role, created_at
from public.profiles
order by created_at;

-- =====================================================================
--  Подтвердить нового эксперта:
--    update public.profiles set role = 'expert' where email = 'name@example.uz';
--
--  Посмотреть заявки:
--    select email, full_name, organization, created_at
--    from public.profiles where role = 'pending' order by created_at;
--
--  Отозвать доступ:
--    update public.profiles set role = 'pending' where email = '...';
-- =====================================================================
