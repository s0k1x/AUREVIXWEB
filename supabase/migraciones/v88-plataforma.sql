-- ==========================================================
--  v88 · PLATAFORMA: seguridad del equipo, soporte, gastos y
--        estadísticas de las webs de cada cliente
--  Solo AÑADE cosas (no borra datos). Se puede repetir sin problema.
--  Pegar en Supabase → SQL Editor → Run.
--
--  1. limitar_equipo: un trabajador (comercial / diseñador) ya no puede
--     cambiar el pago, el precio, el vendedor ni su comisión, ni tocar
--     encargos de otra persona. Solo el propietario confirma pagos y
--     comisiones. (Antes el trabajador asignado podía marcar «Pagado».)
--  2. limitar_ticket: el cliente solo puede añadir sus propias respuestas
--     y reabrir o cerrar su consulta; no puede cambiar la prioridad, a
--     quién está asignada ni lo que escribió el equipo.
--  3. gastos: los gastos del negocio (solo los ve y edita el propietario)
--     para calcular el beneficio en el panel.
--  4. estadisticas_web(pedido): visitas y contactos reales de la web
--     publicada de un cliente (la ve su dueño y el equipo).
-- ==========================================================

-- ---------- 1. Límites del equipo en los pedidos ----------
create or replace function public.limitar_equipo()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  -- Lo que solo puede cambiar el propietario (dinero, vendedor y comisiones)
  fijos text[] := array['uid','total','precioBase','extras','descuento','cupon','urgente','plan','planNombre','iva',
                        'ref','comisionPagada','premioAmigo','pagoEstado','pagoFase','pagoMetodo','pagadoEn',
                        'clienteEmail','createdAt','mantenimiento','cambiosExtra','fraudeRevisado'];
  k text;
  yo text := auth.uid()::text;
begin
  -- El propietario, el servidor (sin sesión) y los clientes (los limita limitar_cliente) siguen igual
  if es_propietario() or not es_equipo() then return new; end if;
  if new.uid is distinct from old.uid or new.created_at is distinct from old.created_at then
    raise exception 'No permitido';
  end if;
  -- Solo sus encargos, o coger uno que nadie tiene
  if coalesce(old.datos ->> 'asignado', '') not in ('', yo) then
    raise exception 'Este encargo lo tiene otra persona';
  end if;
  if coalesce(new.datos ->> 'asignado', '') not in ('', yo) then
    raise exception 'Solo el propietario puede asignar encargos a otra persona';
  end if;
  foreach k in array fijos loop
    if (new.datos -> k) is distinct from (old.datos -> k) then
      raise exception 'Solo el propietario puede cambiar «%»', k;
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists limitar_equipo on public.pedidos;
create trigger limitar_equipo before update on public.pedidos
  for each row execute function public.limitar_equipo();
revoke all on function public.limitar_equipo() from public, anon, authenticated;

-- ---------- 2. Límites del cliente en sus consultas ----------
create or replace function public.limitar_ticket()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  libres text[] := array['respuestas','estado','actualizado','valoracion'];
  antes jsonb := coalesce(old.datos -> 'respuestas', '[]'::jsonb);
  ahora jsonb := coalesce(new.datos -> 'respuestas', '[]'::jsonb);
  n int := jsonb_array_length(coalesce(old.datos -> 'respuestas', '[]'::jsonb));
begin
  if es_equipo() then return new; end if;
  if new.uid is distinct from old.uid or new.created_at is distinct from old.created_at then
    raise exception 'No permitido';
  end if;
  if (new.datos - libres) is distinct from (old.datos - libres) then
    raise exception 'No puedes cambiar ese dato';
  end if;
  if coalesce(new.datos ->> 'estado', 'abierto') not in ('abierto', 'cerrado') then
    raise exception 'No permitido';
  end if;
  -- Lo escrito antes no se toca; solo se añaden mensajes nuevos, y como cliente
  if jsonb_array_length(ahora) < n
     or antes is distinct from (select coalesce(jsonb_agg(x order by i), '[]'::jsonb)
                                from jsonb_array_elements(ahora) with ordinality a(x, i) where i <= n) then
    raise exception 'No puedes cambiar mensajes anteriores';
  end if;
  if exists (select 1 from jsonb_array_elements(ahora) with ordinality a(x, i)
             where i > n and coalesce(x ->> 'rol', '') <> 'client') then
    raise exception 'No permitido';
  end if;
  return new;
end $$;

drop trigger if exists limitar_ticket on public.tickets;
create trigger limitar_ticket before update on public.tickets
  for each row execute function public.limitar_ticket();
revoke all on function public.limitar_ticket() from public, anon, authenticated;

-- ---------- 3. Gastos del negocio ----------
create table if not exists public.gastos (
  id         uuid primary key default gen_random_uuid(),
  fecha      date not null default (now() at time zone 'Europe/Madrid')::date,
  concepto   text not null check (char_length(concepto) between 1 and 200),
  categoria  text not null default 'otros' check (categoria in ('herramientas','dominios','publicidad','comisiones','impuestos','material','formacion','otros')),
  importe    numeric(10,2) not null check (importe >= 0 and importe < 1000000),
  iva        numeric(5,2) not null default 0 check (iva >= 0 and iva <= 30),
  recurrente boolean not null default false,
  nota       text check (char_length(nota) <= 500),
  creado_por uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.gastos enable row level security;
drop policy if exists gastos_propietario on public.gastos;
create policy gastos_propietario on public.gastos for all to authenticated
  using (es_propietario()) with check (es_propietario());
revoke all on public.gastos from anon;
grant select, insert, update, delete on public.gastos to authenticated;
grant all on public.gastos to service_role;
create index if not exists gastos_fecha on public.gastos (fecha);

-- ---------- 4. Estadísticas reales de la web de un cliente ----------
-- La web publicada (aurevixweb.es/<nombre>) cuenta sus visitas como página «w-<nombre>»
-- y los toques en llamar / WhatsApp / correo como «c-<nombre>», en la misma tabla
-- «visitas» (sin cookies ni datos de la persona).
create or replace function public.estadisticas_web(p_pedido uuid, p_dias int default 90)
returns table (dia date, tipo text, origen text, dispositivo text, visitas int)
language plpgsql stable security definer set search_path = public as $$
declare s text;
begin
  if not (es_equipo() or exists (select 1 from pedidos where id = p_pedido and uid = auth.uid())) then
    raise exception 'No permitido';
  end if;
  select left(w.slug, 38) into s from webs_publicas w where w.pedido_id = p_pedido;
  if s is null then return; end if;
  return query
    select v.dia, case when v.pagina like 'c-%' then 'contacto' else 'visita' end, v.origen, v.dispositivo, sum(v.visitas)::int
    from visitas v
    where v.pagina in ('w-' || s, 'c-' || s) and v.dia >= current_date - least(greatest(p_dias, 1), 400)
    group by 1, 2, 3, 4 order by 1;
end $$;
revoke all on function public.estadisticas_web(uuid, int) from public, anon;
grant execute on function public.estadisticas_web(uuid, int) to authenticated;

-- ---------- 5. Avisos de soporte en los dos sentidos ----------
-- Antes solo se avisaba al cliente cuando respondía el equipo. Ahora también:
-- el cliente contesta → aviso a quien la tiene asignada (o a los propietarios);
-- se asigna una consulta → aviso a esa persona.
create or replace function public.avisos_ticket()
returns trigger language plpgsql security definer set search_path = public as $$
declare o uuid; n_antes int; n_ahora int; asig text;
begin
  if tg_op = 'INSERT' then
    for o in select uids_propietarios() loop perform avisar(o, 'Nueva consulta: ' || coalesce(new.datos ->> 'asunto', 'sin asunto'), null, 'soporte'); end loop;
    return new;
  end if;
  n_antes := jsonb_array_length(coalesce(old.datos -> 'respuestas', '[]'));
  n_ahora := jsonb_array_length(coalesce(new.datos -> 'respuestas', '[]'));
  asig := nullif(new.datos ->> 'asignado', '');
  if n_ahora > n_antes then
    if es_equipo() then
      if new.uid is not null then
        perform avisar(new.uid, 'Hemos respondido a tu consulta «' || coalesce(new.datos ->> 'asunto', '') || '»', null, 'soporte');
      end if;
    elsif asig is not null then
      perform avisar(asig::uuid, 'El cliente ha respondido: «' || coalesce(new.datos ->> 'asunto', '') || '»', null, 'soporte');
    else
      for o in select uids_propietarios() loop perform avisar(o, 'El cliente ha respondido: «' || coalesce(new.datos ->> 'asunto', '') || '»', null, 'soporte'); end loop;
    end if;
  end if;
  if asig is not null and asig is distinct from nullif(old.datos ->> 'asignado', '') and asig <> coalesce(auth.uid()::text, '') then
    perform avisar(asig::uuid, 'Te han asignado la consulta «' || coalesce(new.datos ->> 'asunto', '') || '»', null, 'soporte');
  end if;
  return new;
end $$;

-- ---------- 6. Facturas de cuotas de mantenimiento y de cambios extra ----------
-- Además de señal / resto / total: «cuota-2026-11» (mantenimiento de ese mes) y «extra-<id>» (un cambio extra aceptado).
alter table public.facturas drop constraint if exists facturas_fase_check;
alter table public.facturas add constraint facturas_fase_check
  check (fase ~ '^(senal|resto|total|cuota-[0-9]{4}-[0-9]{2}|extra-[a-z0-9]{4,24})$');

-- ---------- 7. Presupuestos de cambios extra: el cliente acepta o rechaza online ----------
-- El equipo propone un cambio extra (concepto + importe) en «cambiosExtra». El cliente solo puede
-- pasar una propuesta a «aceptado» o «rechazado» y dejar constancia del acuerdo (nombre, fecha y texto
-- aceptado); no puede tocar el concepto, el importe ni añadir o quitar propuestas.
create or replace function public.limitar_cliente()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  libres text[] := array['pagoEstado','pagoMetodo','pagoFase','pagoAviso','dominio','contenido','revision','resenada','etapa','estado','historial','cancelacion','cambiosExtra'];
  a jsonb; b jsonb; i int;
begin
  if es_equipo() then return new; end if;
  if new.uid <> old.uid then raise exception 'No permitido'; end if;
  if new.created_at is distinct from old.created_at then raise exception 'No permitido'; end if;
  if (new.datos - libres) <> (old.datos - libres) then raise exception 'No puedes cambiar ese dato'; end if;
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
  -- Cambios extra: misma lista, mismos conceptos e importes; solo «propuesto» → «aceptado» / «rechazado»
  if new.datos -> 'cambiosExtra' is distinct from old.datos -> 'cambiosExtra' then
    a := coalesce(old.datos -> 'cambiosExtra', '[]'::jsonb);
    b := coalesce(new.datos -> 'cambiosExtra', '[]'::jsonb);
    if jsonb_typeof(b) <> 'array' or jsonb_array_length(a) <> jsonb_array_length(b) then raise exception 'No permitido'; end if;
    for i in 0 .. jsonb_array_length(a) - 1 loop
      if (b -> i) is distinct from (a -> i) then
        if (a -> i ->> 'estado') <> 'propuesto' or (b -> i ->> 'estado') not in ('aceptado', 'rechazado')
           or ((b -> i) - 'estado' - 'acuerdo' - 'respondido') is distinct from ((a -> i) - 'estado' - 'acuerdo' - 'respondido') then
          raise exception 'No permitido';
        end if;
      end if;
    end loop;
  end if;
  return new;
end $$;
revoke all on function public.limitar_cliente() from public, anon, authenticated;
