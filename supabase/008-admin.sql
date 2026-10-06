-- =====================================================================
--  MS-7: права для панели администратора
--  Выполнить в Supabase → SQL Editor ПОСЛЕ 007-experts.sql.
--
--  Панель /admin подтверждает регистрации экспертов и показывает, кто
--  выставил какую оценку. Для этого администратору нужно:
--    * читать все профили (раньше каждый видел только свой);
--    * менять роль пользователя: pending → expert, expert → admin и обратно.
--
--  Последнего администратора разжаловать нельзя — иначе подтверждать
--  экспертов и менять веса станет некому, а вернуть роль можно будет
--  только через SQL Editor.
-- =====================================================================

drop policy if exists "admins read profiles" on public.profiles;
create policy "admins read profiles"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admins update roles" on public.profiles;
create policy "admins update roles"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Через панель меняется только роль: email и ФИО приходят из регистрации.
create or replace function public.profiles_guard_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
     or new.email is distinct from old.email
     or new.created_at is distinct from old.created_at then
    raise exception 'У профиля можно изменить только роль.'
      using errcode = 'check_violation';
  end if;

  if old.role = 'admin' and new.role <> 'admin' and not exists (
    select 1 from public.profiles
    where role = 'admin' and id <> old.id
  ) then
    raise exception 'Нельзя снять роль с последнего администратора.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_update on public.profiles;
create trigger profiles_guard_update
  before update on public.profiles
  for each row execute function public.profiles_guard_update();

-- Проверка:
--   select email, role from public.profiles order by created_at;
--   -- должно упасть, если администратор один:
--   update public.profiles set role = 'expert' where role = 'admin';
