-- ==========================================================
-- Hola7273! · Base de datos de citas (Supabase)
-- 1. Crea un proyecto en https://supabase.com (región Europa).
-- 2. Abre «SQL Editor», pega este archivo y pulsa «Run».
-- 3. En «Authentication → Users» crea el usuario hola7273@gmail.com con una contraseña.
--    (Desactiva «Allow new users to sign up» en Authentication → Providers → Email.)
-- 4. Copia «Project URL» y la clave «anon / publishable» en js/config.js → supabase.
-- ==========================================================

create table if not exists public.citas (
  id        uuid primary key default gen_random_uuid(),
  fecha     date not null,
  hora      time not null,
  duracion  int  not null check (duracion between 5 and 480),
  servicio  text not null check (char_length(servicio) <= 80),
  precio    numeric(6,2) not null default 0,
  nombre    text not null check (char_length(nombre) between 2 and 80),
  telefono  text not null check (char_length(telefono) between 9 and 20),
  email     text check (email is null or char_length(email) <= 120),
  nota      text check (nota is null or char_length(nota) <= 400),
  estado    text not null default 'confirmada' check (estado in ('confirmada','hecha','cancelada')),
  creada    timestamptz not null default now()
);
create index if not exists citas_fecha on public.citas (fecha, hora);

-- Evita que dos personas reserven a la vez el mismo hueco
create or replace function public.citas_sin_solape() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.estado <> 'cancelada' and exists (
    select 1 from public.citas c
    where c.fecha = new.fecha and c.id <> new.id and c.estado <> 'cancelada'
      and c.hora < new.hora + make_interval(mins => new.duracion)
      and new.hora < c.hora + make_interval(mins => c.duracion)
  ) then
    raise exception 'Hueco ocupado' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists citas_sin_solape on public.citas;
create trigger citas_sin_solape before insert or update on public.citas
  for each row execute function public.citas_sin_solape();

-- Permisos
alter table public.citas enable row level security;

-- Cualquiera puede reservar (solo crear, nunca leer los datos de otros)
drop policy if exists "reservar" on public.citas;
create policy "reservar" on public.citas for insert to anon
  with check (estado = 'confirmada' and fecha >= current_date and fecha <= current_date + 60);

-- Solo el negocio ve y gestiona las citas
drop policy if exists "negocio lee" on public.citas;
create policy "negocio lee" on public.citas for select to authenticated
  using ((auth.jwt() ->> 'email') = 'hola7273@gmail.com');
drop policy if exists "negocio cambia" on public.citas;
create policy "negocio cambia" on public.citas for update to authenticated
  using ((auth.jwt() ->> 'email') = 'hola7273@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'hola7273@gmail.com');

-- La web solo puede saber qué horas están ocupadas, sin nombres ni teléfonos
create or replace function public.huecos_ocupados(desde date, hasta date)
returns table (fecha date, hora time, duracion int)
language sql stable security definer set search_path = public as $$
  select fecha, hora, duracion from public.citas
  where estado <> 'cancelada' and fecha between desde and least(hasta, desde + 62)
$$;
revoke all on function public.huecos_ocupados(date, date) from public;
grant execute on function public.huecos_ocupados(date, date) to anon, authenticated;

grant insert on public.citas to anon;
grant select, update on public.citas to authenticated;
