-- Minha FT: schema inicial para Supabase
-- Execute no SQL Editor do projeto Supabase.
-- Segurança: RLS está ativado. Usuários não podem mudar a própria role/status.
-- Cadastro público sempre começa como usuário pendente.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'user' check (role in ('admin', 'user')),
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Cada pessoa pode ler apenas seu próprio perfil.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

-- A criação do perfil ocorre pelo trigger seguro, não pelo navegador.
revoke insert, update, delete on public.profiles from anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role, approval_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'user',
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Aprovação administrativa: faça a alteração no SQL Editor após verificar o e-mail/ID.
-- 1) Para aprovar um usuário:
-- update public.profiles p
-- set approval_status = 'approved'
-- from auth.users u
-- where p.id = u.id and lower(u.email) = lower('usuario@exemplo.com');

-- 2) Para conceder perfil de administrador a uma conta específica, após verificar a identidade:
-- update public.profiles p
-- set role = 'admin', approval_status = 'approved'
-- from auth.users u
-- where p.id = u.id and lower(u.email) = lower('admin@exemplo.com');

-- IMPORTANTE: não crie uma política pública que permita editar role ou approval_status.
