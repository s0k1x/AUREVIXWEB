-- ==========================================================
--  v60 · SUSCRIPCIÓN A LA LIBRERÍA (9 €/mes)
--  Se puede repetir sin problema. Pegar en Supabase → SQL Editor → Run.
--  - Cada fila dice hasta cuándo tiene acceso una persona.
--  - Solo el equipo la activa, la alarga o la quita (Ajustes → Librería).
--  - Cada cliente solo puede ver la suya.
-- ==========================================================
create table if not exists public.suscripciones (
  uid uuid primary key references auth.users (id) on delete cascade,
  hasta timestamptz not null,
  actualizado timestamptz not null default now(),
  por uuid default auth.uid()
);
alter table public.suscripciones enable row level security;

drop policy if exists sus_ver on public.suscripciones;
create policy sus_ver on public.suscripciones for select to authenticated
  using (uid = auth.uid() or es_equipo());
drop policy if exists sus_equipo on public.suscripciones;
create policy sus_equipo on public.suscripciones for all to authenticated
  using (es_equipo()) with check (es_equipo());

revoke all on public.suscripciones from anon;
grant select, insert, update, delete on public.suscripciones to authenticated;
