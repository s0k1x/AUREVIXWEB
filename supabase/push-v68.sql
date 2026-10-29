-- ==========================================================
--  v68 · NOTIFICACIONES PUSH (como las de WhatsApp)
--  Se puede repetir sin problema. Pegar en Supabase → SQL Editor → Run.
--  - Cada dispositivo en el que alguien activa las notificaciones
--    guarda aquí su suscripción (la da el navegador).
--  - Cada persona solo ve, crea y borra las suyas.
--  - La función «notificar» (con la clave de servicio) las lee para
--    mandar cada aviso de la campana como notificación.
--  - Desde v68 los correos solo se usan para facturas, recibos y
--    códigos de acceso: el resto llega como notificación.
-- ==========================================================
create table if not exists public.push_subs (
  endpoint text primary key check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  uid uuid not null default auth.uid() references auth.users (id) on delete cascade,
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  dispositivo text not null default '' check (char_length(dispositivo) <= 120),
  creado timestamptz not null default now()
);
create index if not exists push_subs_uid on public.push_subs (uid);
alter table public.push_subs enable row level security;

drop policy if exists push_mias on public.push_subs;
create policy push_mias on public.push_subs for all to authenticated
  using (uid = auth.uid()) with check (uid = auth.uid());

revoke all on public.push_subs from anon, authenticated;
grant select, insert, update, delete on public.push_subs to authenticated;
grant all on public.push_subs to service_role;

-- Claves VAPID: las crea la función «notificar» la primera vez. Solo las lee el servidor.
create table if not exists public.claves_push (
  id int primary key default 1 check (id = 1),
  publica text not null,
  privada text not null,
  creado timestamptz not null default now()
);
alter table public.claves_push enable row level security;
revoke all on public.claves_push from anon, authenticated;
grant all on public.claves_push to service_role;
