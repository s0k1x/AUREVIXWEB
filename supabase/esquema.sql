-- ==========================================================
--  BASE DE DATOS DE LA WEB (Supabase)
--  Cómo usarlo: Supabase → SQL Editor → New query → pega todo
--  este archivo → Run. Solo hay que hacerlo una vez.
--  Antes, cambia tuemail@gmail.com (abajo) por tu email.
-- ==========================================================

-- Propietarios: acceso total al panel
create table if not exists public.propietarios (email text primary key);
insert into public.propietarios (email) values ('tuemail@gmail.com') on conflict do nothing;

-- Perfiles de usuario (uno por cuenta)
create table if not exists public.perfiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '',
  email text not null default '',
  photo text not null default '',
  role text not null default 'client' check (role in ('client', 'worker')),
  created_at timestamptz not null default now()
);

-- Pedidos, candidaturas y reseñas: cada fila guarda el documento en "datos"
create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  uid uuid not null references auth.users on delete cascade,
  datos jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table if not exists public.candidaturas (
  id uuid primary key default gen_random_uuid(),
  uid uuid not null references auth.users on delete cascade,
  datos jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table if not exists public.resenas (
  id uuid primary key default gen_random_uuid(),
  uid uuid not null references auth.users on delete cascade,
  datos jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists pedidos_uid on public.pedidos (uid);
create index if not exists candidaturas_uid on public.candidaturas (uid);

-- ---------- Quién es quién ----------
create or replace function public.es_propietario() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from propietarios where lower(email) = lower(auth.jwt() ->> 'email'));
$$;
create or replace function public.es_equipo() returns boolean
language sql stable security definer set search_path = public as $$
  select es_propietario() or exists (select 1 from perfiles where id = auth.uid() and role = 'worker');
$$;

-- Crear el perfil automáticamente al registrarse
create or replace function public.nuevo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into perfiles (id, name, email, photo)
  values (new.id,
          coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
          new.email,
          coalesce(new.raw_user_meta_data ->> 'avatar_url', ''))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists al_registrarse on auth.users;
create trigger al_registrarse after insert on auth.users for each row execute function public.nuevo_usuario();

-- ---------- Permisos (Row Level Security) ----------
alter table public.propietarios enable row level security;
alter table public.perfiles enable row level security;
alter table public.pedidos enable row level security;
alter table public.candidaturas enable row level security;
alter table public.resenas enable row level security;

-- Perfiles: cada uno ve el suyo; el equipo ve todos; solo el propietario cambia roles
drop policy if exists perfiles_ver on public.perfiles;
create policy perfiles_ver on public.perfiles for select using (id = auth.uid() or es_equipo());
drop policy if exists perfiles_crear on public.perfiles;
create policy perfiles_crear on public.perfiles for insert with check (id = auth.uid() and role = 'client');
drop policy if exists perfiles_editar on public.perfiles;
create policy perfiles_editar on public.perfiles for update using (id = auth.uid() or es_propietario());

create or replace function public.proteger_rol() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not es_propietario() then
    raise exception 'Solo el propietario puede cambiar roles';
  end if;
  return new;
end $$;
drop trigger if exists proteger_rol on public.perfiles;
create trigger proteger_rol before update on public.perfiles for each row execute function public.proteger_rol();

-- Pedidos: el cliente crea y ve los suyos; el equipo ve y edita todos; el propietario borra
drop policy if exists pedidos_ver on public.pedidos;
create policy pedidos_ver on public.pedidos for select using (uid = auth.uid() or es_equipo());
drop policy if exists pedidos_crear on public.pedidos;
create policy pedidos_crear on public.pedidos for insert with check (
  uid = auth.uid() and datos ->> 'pagoEstado' = 'pendiente' and datos ->> 'estado' = 'nuevo'
  and coalesce(datos ->> 'asignado', '') = ''
);
drop policy if exists pedidos_editar on public.pedidos;
create policy pedidos_editar on public.pedidos for update using (uid = auth.uid() or es_equipo());
drop policy if exists pedidos_borrar on public.pedidos;
create policy pedidos_borrar on public.pedidos for delete using (es_propietario());

-- El cliente solo puede tocar: aviso de pago, dominio, contenido, revisión, reseña
-- y avanzar la etapa cuando él completa su parte.
create or replace function public.limitar_cliente() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  libres text[] := array['pagoEstado','pagoMetodo','pagoFase','pagoAviso','dominio','contenido','revision','resenada','etapa','estado'];
begin
  if es_equipo() then return new; end if;
  if new.uid <> old.uid then raise exception 'No permitido'; end if;
  if (new.datos - libres) <> (old.datos - libres) then raise exception 'No puedes cambiar ese dato'; end if;
  if new.datos ->> 'pagoEstado' is distinct from old.datos ->> 'pagoEstado'
     and new.datos ->> 'pagoEstado' <> 'verificando' then raise exception 'No permitido'; end if;
  if new.datos ->> 'etapa' is distinct from old.datos ->> 'etapa' and not (
       (old.datos ->> 'etapa' = 'dominio'   and new.datos ->> 'etapa' = 'contenido') or
       (old.datos ->> 'etapa' = 'contenido' and new.datos ->> 'etapa' = 'diseno') or
       (old.datos ->> 'etapa' = 'revision'  and new.datos ->> 'etapa' = 'pago')
     ) then raise exception 'No permitido'; end if;
  if new.datos ->> 'estado' is distinct from old.datos ->> 'estado'
     and new.datos ->> 'etapa' is not distinct from old.datos ->> 'etapa' then raise exception 'No permitido'; end if;
  return new;
end $$;
drop trigger if exists limitar_cliente on public.pedidos;
create trigger limitar_cliente before update on public.pedidos for each row execute function public.limitar_cliente();

-- Candidaturas: cada uno envía y ve la suya; el equipo las ve; el propietario las gestiona
drop policy if exists cand_ver on public.candidaturas;
create policy cand_ver on public.candidaturas for select using (uid = auth.uid() or es_equipo());
drop policy if exists cand_crear on public.candidaturas;
create policy cand_crear on public.candidaturas for insert with check (uid = auth.uid() and datos ->> 'estado' = 'pendiente');
drop policy if exists cand_editar on public.candidaturas;
create policy cand_editar on public.candidaturas for update using (es_propietario());

-- Reseñas: todo el mundo ve las aprobadas; el cliente escribe la suya (sin aprobar);
-- el propietario aprueba, oculta o borra
drop policy if exists res_ver on public.resenas;
create policy res_ver on public.resenas for select using ((datos ->> 'aprobada')::boolean is true or uid = auth.uid() or es_equipo());
drop policy if exists res_crear on public.resenas;
create policy res_crear on public.resenas for insert with check (uid = auth.uid() and coalesce((datos ->> 'aprobada')::boolean, false) = false);
drop policy if exists res_editar on public.resenas;
create policy res_editar on public.resenas for update using (es_propietario());
drop policy if exists res_borrar on public.resenas;
create policy res_borrar on public.resenas for delete using (es_propietario());

-- La tabla de propietarios no se puede leer desde la web
drop policy if exists prop_nadie on public.propietarios;
create policy prop_nadie on public.propietarios for select using (false);
