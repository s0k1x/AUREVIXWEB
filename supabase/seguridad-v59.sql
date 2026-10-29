-- ==========================================================
--  v59 · SEGURIDAD (auditoría)
--  Se puede repetir sin problema. Pegar en Supabase → SQL Editor → Run.
--  1. Avisos: solo los crean los disparadores (antes cualquiera podía
--     insertar avisos propios con texto libre → ahora se mandan por correo).
--  2. Pedidos: el precio se valida en el servidor (antes lo decidía el navegador).
--  3. limitar_cliente: un pedido pagado no puede volver a «por verificar»
--     y no se puede tocar la fecha de creación.
--  4. Quitar permisos que no se usan (TRUNCATE, TRIGGER, REFERENCES).
--  5. Los avisos solo permiten cambiar «leido».
--  6. Límite de tamaño del JSON de cada tabla.
-- ==========================================================

-- 1) Avisos: nadie los inserta desde la web
drop policy if exists av_crear on public.avisos;

-- 5) Avisos: el usuario solo puede marcar como leído
revoke update on public.avisos from authenticated;
grant update (leido) on public.avisos to authenticated;

-- 3) Lo que puede tocar un cliente en su pedido
create or replace function public.limitar_cliente() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  libres text[] := array['pagoEstado','pagoMetodo','pagoFase','pagoAviso','dominio','contenido','revision','resenada','etapa','estado','historial','cancelacion'];
begin
  if es_equipo() then return new; end if;
  if new.uid <> old.uid then raise exception 'No permitido'; end if;
  if new.created_at is distinct from old.created_at then raise exception 'No permitido'; end if;
  if (new.datos - libres) <> (old.datos - libres) then raise exception 'No puedes cambiar ese dato'; end if;
  -- «por verificar» solo se puede poner desde sin pagar o con la señal pagada
  if new.datos ->> 'pagoEstado' is distinct from old.datos ->> 'pagoEstado'
     and (new.datos ->> 'pagoEstado' <> 'verificando'
          or coalesce(old.datos ->> 'pagoEstado', 'pendiente') not in ('pendiente', 'senal')) then
    raise exception 'No permitido';
  end if;
  if new.datos ->> 'etapa' is distinct from old.datos ->> 'etapa' and not (
       (old.datos ->> 'etapa' = 'dominio'   and new.datos ->> 'etapa' = 'contenido') or
       (old.datos ->> 'etapa' = 'contenido' and new.datos ->> 'etapa' = 'diseno') or
       (old.datos ->> 'etapa' = 'revision'  and new.datos ->> 'etapa' = 'pago')
     ) then raise exception 'No permitido'; end if;
  if new.datos ->> 'estado' is distinct from old.datos ->> 'estado'
     and new.datos ->> 'etapa' is not distinct from old.datos ->> 'etapa' then raise exception 'No permitido'; end if;
  return new;
end $$;

-- 2) El precio de un pedido nuevo se recalcula en el servidor con los precios de «Ajustes»
create or replace function public.validar_pedido() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  w jsonb; d jsonb := new.datos;
  base numeric; urg numeric; unico numeric := 0; bruto numeric; pct numeric := 0; dto numeric; esperado numeric;
  e jsonb; pe numeric; pc numeric; cup jsonb;
begin
  if es_equipo() then return new; end if;
  select datos into w from ajustes where clave = 'web';
  if w is null then return new; end if;                       -- aún no hay precios guardados: no se puede comprobar
  base := (w -> 'planes' -> (d ->> 'plan') ->> 'precio')::numeric;
  if base is null then return new; end if;                    -- plan sin precio guardado
  if (d ->> 'precioBase')::numeric is distinct from base then
    raise exception 'Los precios han cambiado. Recarga la página e inténtalo de nuevo.';
  end if;
  urg := coalesce((w ->> 'urgente')::numeric, 0.3);
  for e in select * from jsonb_array_elements(coalesce(d -> 'extras', '[]'::jsonb)) loop
    pc := (e ->> 'precio')::numeric;
    if pc is null or pc < 0 then raise exception 'Extra no válido'; end if;
    pe := (w -> 'extras' -> (e ->> 'id') ->> 'precio')::numeric;
    if pe is not null and pe <> pc then
      raise exception 'Los precios han cambiado. Recarga la página e inténtalo de nuevo.';
    end if;
    if not coalesce((e ->> 'mensual')::boolean, false) then unico := unico + pc; end if;
  end loop;
  bruto := base + case when coalesce((d ->> 'urgente')::boolean, false) then base * urg else 0 end + unico;
  if coalesce(d ->> 'cupon', '') <> '' then
    cup := cupon(d ->> 'cupon');
    if cup is null then raise exception 'Ese cupón ya no es válido. Recarga la página.'; end if;
    pct := coalesce((cup ->> 'pct')::numeric, 0);
  end if;
  dto := round(bruto * pct) / 100;
  esperado := round(bruto - dto, 2);
  if abs(coalesce((d ->> 'total')::numeric, -1) - esperado) > 0.05
     or abs(coalesce((d ->> 'descuento')::numeric, 0) - dto) > 0.05 then
    raise exception 'El precio no coincide con el actual. Recarga la página e inténtalo de nuevo.';
  end if;
  return new;
end $$;
revoke execute on function public.validar_pedido() from public, anon, authenticated;
drop trigger if exists validar_pedido on public.pedidos;
create trigger validar_pedido before insert on public.pedidos for each row execute function public.validar_pedido();

-- 4) Permisos que la web no usa
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke truncate, trigger, references on tables from anon, authenticated;

-- 6) Tamaño máximo del JSON (no_valido primero: no bloquea filas ya existentes; luego se valida)
do $$
declare t text; lim int;
begin
  for t, lim in values ('pedidos', 300000), ('tickets', 100000), ('mensajes', 50000), ('avisos', 10000),
                       ('candidaturas', 100000), ('resenas', 20000), ('perfiles', 50000), ('privado', 20000), ('videos', 50000)
  loop
    if not exists (select 1 from pg_constraint where conname = t || '_datos_max') then
      execute format('alter table public.%I add constraint %I check (pg_column_size(datos) < %s) not valid', t, t || '_datos_max', lim);
      execute format('alter table public.%I validate constraint %I', t, t || '_datos_max');
    end if;
  end loop;
end $$;
