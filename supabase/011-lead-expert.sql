-- =====================================================================
--  MS-7: роль «Главный эксперт» (lead)
--  Выполнить в Supabase → SQL Editor ПОСЛЕ 010-tours-evidence-audit.sql.
--
--  Главный эксперт:
--    • оценивает издания, как обычный эксперт;
--    • сам создаёт, переименовывает, открывает и закрывает туры.
--  Чужие оценки, роли пользователей, веса и журнал ему недоступны —
--  это остаётся за администратором. Назначает главного эксперта только
--  администратор (политика «admins update roles» из 008).
--
--  Заодно: названия изданий из 009 без русских приписок («частный»,
--  «газета», «бывш.» → xususiy, gazeta, sobiq) — только у тех записей,
--  которые ещё никто не правил.
-- =====================================================================

-- 1. Новое значение роли.
alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('pending', 'expert', 'lead', 'admin'));

-- 2. Главный эксперт — тоже эксперт: пишет оценки и справочник изданий.
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
      and role in ('expert', 'lead', 'admin')
  );
$$;

-- 3. Кто управляет турами: главный эксперт и администратор.
create or replace function public.is_lead()
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
      and role in ('lead', 'admin')
  );
$$;

grant execute on function public.is_lead() to anon, authenticated;

drop policy if exists "admins manage periods" on public.monitoring_periods;
drop policy if exists "leads manage periods" on public.monitoring_periods;
create policy "leads manage periods"
  on public.monitoring_periods for all
  to authenticated
  using (public.is_lead())
  with check (public.is_lead());


-- ---------------------------------------------------------------------
--  Названия изданий из 009 без русских приписок
-- ---------------------------------------------------------------------
-- Меняются только записи, которые никто ещё не правил вручную.
update public.media_outlets o
set name = f.new_name
from (values
  ('muloqot-tv', 'Muloqot TV (Коканд)', 'Muloqot TV (Qo‘qon)'),
  ('jizzax-tv', 'Jizzax TV (НТРК)', 'Jizzax TV (MTRK)'),
  ('jizzax-tv-2', 'Jizzax TV (частный)', 'Jizzax TV (xususiy)'),
  ('navoiy-tv', 'Navoiy TV (НТРК)', 'Navoiy TV (MTRK)'),
  ('navoiy-tv-2', 'Navoiy TV (частный)', 'Navoiy TV (xususiy)'),
  ('qashqadaryogz-uz', 'Qashqadaryo (газета)', 'Qashqadaryo (gazeta)'),
  ('samarkandnews-uz', 'Samarqand (газета)', 'Samarqand (gazeta)'),
  ('ishonch-tv', 'Ishonch TV (Термез)', 'Ishonch TV (Termiz)'),
  ('sirdaryo24-uz', 'Yangi Sirdaryo (бывш. «Sirdaryo haqiqati»)', 'Yangi Sirdaryo (sobiq «Sirdaryo haqiqati»)'),
  ('jaslar-tv', 'Jaslar TV (Нукус)', 'Jaslar TV (Nukus)'),
  ('uza-uz', 'UzA — Национальное информационное агентство', 'UzA — O‘zbekiston Milliy axborot agentligi'),
  ('stv-uz', 'STV Самарканд', 'STV Samarqand'),
  ('kknews-uz', 'Каракалпакское информационное агентство', 'Qoraqalpog‘iston axborot agentligi')
) as f(slug, old_name, new_name)
where o.slug = f.slug and o.name = f.old_name;

-- Проверка:
--   select email, role from public.profiles order by created_at;
--   назначить: update public.profiles set role = 'lead' where email = '...';
