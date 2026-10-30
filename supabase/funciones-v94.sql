-- ==========================================================
--  v94 · FUNCIONES NUEVAS: cifras de la portada, reservas de llamada,
--        recordatorios automáticos e informe mensual por correo.
--  Solo AÑADE cosas (no borra datos). Se puede repetir sin problema.
--  Pegar en Supabase → SQL Editor → Run.
-- ==========================================================

-- ---------- 1. Cifras de la portada (solo totales, nunca datos de nadie) ----------
create or replace function public.cifras_publicas()
returns jsonb language sql stable security definer set search_path = public as $$
  with ent as (
    select p.created_at, (p.datos ->> 'createdAt')::numeric as creado,
           (select min((h ->> 't')::numeric) from jsonb_array_elements(coalesce(p.datos -> 'historial', '[]')) h
             where h ->> 'texto' ~ '^(Estado: Entregado|Etapa: Publicada)') as entregado
    from pedidos p where p.datos ->> 'estado' = 'entregado'
  ), res as (
    select (datos ->> 'estrellas')::numeric as e from resenas where datos ->> 'aprobada' = 'true' and coalesce(datos ->> 'demo', 'false') <> 'true'
  )
  select jsonb_build_object(
    'entregadas', (select count(*) from ent),
    'dias', (select round(avg((entregado - creado) / 86400000)) from ent where entregado > creado),
    'valoracion', (select round(avg(e), 2) from res),
    'resenas', (select count(*) from res),
    'por_mes', (select jsonb_agg(coalesce((select count(*) from ent where date_trunc('month', to_timestamp(coalesce(entregado, creado) / 1000)) = m), 0) order by m)
                from generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') m)
  );
$$;
revoke all on function public.cifras_publicas() from public;
grant execute on function public.cifras_publicas() to anon, authenticated;

-- ---------- 2. Reservas de llamada ----------
-- Horas ya reservadas (solo la hora, nunca quién): para enseñar los huecos libres
create or replace function public.huecos_ocupados()
returns table (llamada timestamptz) language sql stable security definer set search_path = public as $$
  select (datos ->> 'llamada')::timestamptz from tickets
   where datos ->> 'tipo' = 'llamada' and coalesce(datos ->> 'estado', 'abierto') <> 'cerrado'
     and (datos ->> 'llamada')::timestamptz > now() - interval '1 day';
$$;
revoke all on function public.huecos_ocupados() from public;
grant execute on function public.huecos_ocupados() to anon, authenticated;
-- Nadie puede reservar una hora que ya está cogida
create unique index if not exists llamada_unica on public.tickets ((datos ->> 'llamada'))
  where datos ->> 'tipo' = 'llamada' and coalesce(datos ->> 'estado', 'abierto') <> 'cerrado';

-- ---------- 3. Recordatorios automáticos e informe mensual ----------
-- Lo que ya se ha enviado (para no repetir un recordatorio). Solo lo usa el servidor.
create table if not exists public.recordatorios_enviados (
  clave   text primary key,
  pedido  uuid,
  enviado timestamptz not null default now()
);
alter table public.recordatorios_enviados enable row level security;
revoke all on public.recordatorios_enviados from anon, authenticated;
grant all on public.recordatorios_enviados to service_role;

-- Secreto de la tarea programada: se crea aquí dentro (Vault) y nunca sale de la base de datos.
-- La función «recordatorios» lo lee con la clave de servicio para comprobar que la llamada viene de esta tarea.
do $$ begin
  if not exists (select 1 from vault.secrets where name = 'aurevix_cron') then
    perform vault.create_secret(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 'aurevix_cron', 'Firma de la tarea diaria de recordatorios');
  end if;
end $$;
create or replace function public.cron_secreto()
returns text language sql stable security definer set search_path = public as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'aurevix_cron';
$$;
revoke all on function public.cron_secreto() from public, anon, authenticated;
grant execute on function public.cron_secreto() to service_role;

-- Todos los días a las 9:10 (hora de Madrid ≈ 8:10 UTC en invierno) se llama a la función «recordatorios».
-- El día 1 de cada mes además envía el informe mensual a los clientes con mantenimiento.
select cron.unschedule(jobid) from cron.job where jobname = 'aurevix-recordatorios';
select cron.schedule('aurevix-recordatorios', '10 8 * * *', $$
  select net.http_post(
    url := 'https://jmmwuiuhwxgwnyqectcb.supabase.co/functions/v1/recordatorios',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron', (select decrypted_secret from vault.decrypted_secrets where name = 'aurevix_cron')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$$);
