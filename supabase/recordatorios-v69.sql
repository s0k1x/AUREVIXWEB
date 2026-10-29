-- ==========================================================
--  v69 · RECORDATORIOS AUTOMÁTICOS (como notificaciones)
--  Se puede repetir sin problema. Pegar en Supabase → SQL Editor → Run.
--  Cada día a las 10:00 (hora de España en invierno) se revisan los pedidos
--  y, si alguno lleva 3 días sin novedades, se crea un aviso en la campana,
--  que llega como notificación push (función «notificar»). Nunca por correo.
--  - Al cliente: señal sin pagar; o su etapa (dominio, contenido, revisión,
--    pago final) parada.
--  - Al propietario: un pago lleva más de un día «por verificar».
--  Como mucho cada 3 días y 3 veces por pedido y motivo.
-- ==========================================================
create extension if not exists pg_cron;

-- probar = true: no crea avisos, solo devuelve lo que haría
create or replace function public.recordatorios(probar boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  p record;
  ahora bigint := (extract(epoch from now()) * 1000)::bigint;
  ultima bigint;
  nombre text;
  clave text;
  tipo text;
  texto text;
  dest uuid;
  hechos jsonb := '[]'::jsonb;
begin
  for p in select id, uid, datos, created_at from pedidos
           where coalesce(datos ->> 'estado', '') not in ('cancelado', 'entregado') loop
    -- Última novedad: lo último del historial o, si no hay, cuándo se creó
    -- (solo números: un dato raro no debe parar todo)
    select greatest(coalesce(max(case when h ->> 't' ~ '^\d{10,14}$' then (h ->> 't')::bigint end), 0),
                    case when p.datos ->> 'createdAt' ~ '^\d{10,14}$' then (p.datos ->> 'createdAt')::bigint else (extract(epoch from p.created_at) * 1000)::bigint end) into ultima
      from jsonb_array_elements(case when jsonb_typeof(p.datos -> 'historial') = 'array' then p.datos -> 'historial' else '[]'::jsonb end) h;
    nombre := coalesce(nullif(p.datos -> 'respuestas' ->> 'negocio', ''), p.datos ->> 'planNombre', 'tu web');
    clave := null;

    if coalesce(p.datos ->> 'pagoEstado', 'pendiente') = 'verificando' then
      -- Al propietario: pago por revisar desde hace más de un día
      if ahora - ultima < 86400000 then continue; end if;
      clave := 'verificar'; tipo := 'pago';
      texto := format('El pago de «%s» lleva más de un día por verificar', nombre);
    else
      if ahora - ultima < 3 * 86400000 then continue; end if;
      if coalesce(p.datos ->> 'pagoEstado', 'pendiente') = 'pendiente' and coalesce(p.datos ->> 'etapa', '') <> 'pago' then
        clave := 'senal'; tipo := 'pago';
        texto := format('Recuerda: para empezar «%s» falta pagar la señal', nombre);
      elsif p.datos ->> 'etapa' in ('dominio', 'contenido', 'revision')
            or (p.datos ->> 'etapa' = 'pago' and coalesce(p.datos ->> 'pagoEstado', '') <> 'pagado') then
        clave := 'etapa-' || (p.datos ->> 'etapa'); tipo := 'etapa';
        texto := case p.datos ->> 'etapa'
          when 'dominio' then format('«%s» te espera: elige la dirección de tu web para seguir', nombre)
          when 'contenido' then format('«%s» te espera: envíanos los textos, fotos y logotipo', nombre)
          when 'revision' then format('La vista previa de «%s» está lista: revísala y apruébala o pide cambios', nombre)
          else format('«%s» está terminada: falta el pago final para publicarla', nombre) end;
      end if;
    end if;
    if clave is null then continue; end if;

    -- A quién: al cliente o, si es un pago por verificar, a cada propietario
    for dest in
      select p.uid where clave <> 'verificar'
      union
      select f.id from perfiles f join propietarios o on lower(o.email) = lower(f.email) where clave = 'verificar'
    loop
      -- Como mucho 3 veces y una cada 3 días (cada día si es para verificar un pago)
      if (select count(*) from avisos where uid = dest and datos ->> 'pedido' = p.id::text and datos ->> 'recordatorio' = clave) >= 3 then continue; end if;
      if exists (select 1 from avisos where uid = dest and datos ->> 'pedido' = p.id::text and datos ->> 'recordatorio' = clave
                  and created_at > now() - case when clave = 'verificar' then interval '20 hours' else interval '3 days' end) then continue; end if;
      hechos := hechos || jsonb_build_object('pedido', p.id, 'motivo', clave, 'a', dest);
      if not probar then
        insert into avisos (uid, datos) values (dest, jsonb_build_object('tipo', tipo, 'texto', texto, 'pedido', p.id, 't', ahora, 'recordatorio', clave));
      end if;
    end loop;
  end loop;
  return hechos;
end $$;

revoke execute on function public.recordatorios(boolean) from public, anon, authenticated;

-- Cada día a las 9:07 UTC (10:07 en invierno, 11:07 en verano en España)
select cron.unschedule('recordatorios') where exists (select 1 from cron.job where jobname = 'recordatorios');
select cron.schedule('recordatorios', '7 9 * * *', 'select public.recordatorios()');
