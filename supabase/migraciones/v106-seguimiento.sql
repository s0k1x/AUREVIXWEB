-- ==========================================================
--  v106 · SEGUIMIENTO PÚBLICO DEL PROYECTO
--  El cliente (o el equipo) crea un enlace secreto para enseñar cómo va su web
--  sin iniciar sesión (aurevixweb.es/seguimiento?t=…). Solo enseña el avance:
--  negocio, tipo de web, etapa, fechas de cada etapa y entrega prevista.
--  Nunca nombres, correos, teléfonos, precios ni archivos.
--  Los enlaces van en una tabla aparte: no se toca el pedido ni sus avisos.
--  Solo AÑADE cosas. Se puede repetir sin problema.
-- ==========================================================
create table if not exists public.seguimientos (
  token  text primary key,
  pedido uuid not null unique references public.pedidos on delete cascade,
  creado timestamptz not null default now()
);
alter table public.seguimientos enable row level security;
revoke all on public.seguimientos from anon, authenticated;
grant all on public.seguimientos to service_role;

-- Crea (o devuelve) el enlace de un pedido. Solo su cliente o el equipo.
create or replace function public.crear_seguimiento(p_pedido uuid)
returns text language plpgsql security definer set search_path = public as $$
declare t text;
begin
  if not exists (select 1 from pedidos where id = p_pedido and (uid = auth.uid() or es_equipo())) then
    raise exception 'No encontramos ese proyecto';
  end if;
  select token into t from seguimientos where pedido = p_pedido;
  if t is null then
    t := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
    insert into seguimientos (token, pedido) values (t, p_pedido) on conflict (pedido) do nothing;
    select token into t from seguimientos where pedido = p_pedido;
  end if;
  return t;
end $$;
revoke all on function public.crear_seguimiento(uuid) from public, anon;
grant execute on function public.crear_seguimiento(uuid) to authenticated;

-- Lo que ve cualquiera con el enlace: solo el avance
create or replace function public.ver_seguimiento(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'negocio', coalesce(p.datos -> 'respuestas' ->> 'negocio', ''),
    'plan', p.datos ->> 'plan', 'planNombre', p.datos ->> 'planNombre',
    'etapa', p.datos ->> 'etapa', 'estado', p.datos ->> 'estado',
    'createdAt', p.datos -> 'createdAt', 'fechaEntrega', p.datos -> 'fechaEntrega', 'urgente', p.datos -> 'urgente',
    'hitos', coalesce((select jsonb_agg(jsonb_build_object('texto', h ->> 'texto', 't', h -> 't'))
                         from jsonb_array_elements(coalesce(p.datos -> 'historial', '[]')) h
                        where h ->> 'texto' like 'Etapa:%' or h ->> 'texto' like 'Estado:%'), '[]'))
  from seguimientos s join pedidos p on p.id = s.pedido
  where s.token = p_token and p_token ~ '^[a-f0-9]{64}$' and coalesce(p.datos ->> 'estado', '') <> 'cancelado';
$$;
revoke all on function public.ver_seguimiento(text) from public;
grant execute on function public.ver_seguimiento(text) to anon, authenticated;
