
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  organization text,
  role        text not null default 'pending'
              check (role in ('pending', 'expert', 'admin')),
  created_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Профили с ролями. Новая регистрация = pending: читать можно всё, писать — ничего.';


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


insert into public.profiles (id, email, role)
select u.id, u.email, 'expert'
from auth.users u
on conflict (id) do nothing;


alter table public.profiles enable row level security;

drop policy if exists "own profile readable" on public.profiles;
create policy "own profile readable"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);


drop policy if exists "own profile updatable" on public.profiles;

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


select email, role, created_at
from public.profiles
order by created_at;

