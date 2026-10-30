-- ==========================================================
--  v61 · FACTURAS AUTOMÁTICAS AL CONFIRMAR UN PAGO
--  Se puede repetir sin problema. Pegar en Supabase → SQL Editor → Run.
--  - Cada pago confirmado (señal, resto o total) tiene UNA factura con
--    número correlativo por año: 2026-0001, 2026-0002…
--  - La crea la función «correo» (clave de servidor) al enviar el correo;
--    si se reenvía, se reutiliza la misma factura y el mismo número.
--  - El cliente ve solo las suyas; el equipo, todas. Nadie las cambia
--    desde la web (las facturas no se editan).
-- ==========================================================
create table if not exists public.facturas (
  id bigint generated always as identity primary key,
  numero text not null unique,
  anio int not null,
  n int not null,
  pedido uuid not null references public.pedidos (id) on delete restrict,
  uid uuid,
  fase text not null check (fase in ('senal', 'resto', 'total')),
  datos jsonb not null,
  created_at timestamptz not null default now(),
  unique (pedido, fase),
  unique (anio, n)
);
alter table public.facturas enable row level security;
drop policy if exists fac_ver on public.facturas;
create policy fac_ver on public.facturas for select to authenticated
  using (uid = auth.uid() or es_equipo());
revoke all on public.facturas from anon, authenticated;
grant select on public.facturas to authenticated;

-- Número siguiente sin huecos ni duplicados (un bloqueo por año evita carreras)
create or replace function public.crear_factura(p_pedido uuid, p_uid uuid, p_fase text, p_datos jsonb)
returns public.facturas
language plpgsql security definer set search_path = public as $$
declare f public.facturas; a int := extract(year from now() at time zone 'Europe/Madrid');
begin
  select * into f from facturas where pedido = p_pedido and fase = p_fase;
  if found then return f; end if;
  perform pg_advisory_xact_lock(hashtext('facturas'), a);
  insert into facturas (numero, anio, n, pedido, uid, fase, datos)
  select a || '-' || lpad((coalesce(max(n), 0) + 1)::text, 4, '0'), a, coalesce(max(n), 0) + 1, p_pedido, p_uid, p_fase, p_datos
  from facturas where anio = a
  returning * into f;
  return f;
end $$;
revoke execute on function public.crear_factura(uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.crear_factura(uuid, uuid, text, jsonb) to service_role;
grant select on public.facturas, public.ajustes to service_role;
