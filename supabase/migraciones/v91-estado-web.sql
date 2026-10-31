-- ==========================================================
--  v91 · ESTADO DE LA WEB: cierre de verdad en el servidor
--  Con la web en «demostración» o en «mantenimiento» (Ajustes → Negocio,
--  ajustes.web.estadoWeb), los visitantes y los clientes no pueden escribir
--  en la base de datos: ni pedidos, ni pagos, ni consultas, ni mensajes,
--  ni candidaturas, ni reseñas, ni vídeos. Aunque se salten la pantalla de
--  espera desde el navegador.
--  No afecta al propietario ni a los trabajadores, ni a las funciones del
--  servidor (correos, facturas), que usan la clave de servicio.
--  Solo AÑADE cosas. Se puede repetir sin problema.
-- ==========================================================

create or replace function public.web_cerrada()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select datos ->> 'estadoWeb' from ajustes where clave = 'web'), 'normal') in ('demo', 'mantenimiento')
     and coalesce(auth.role(), '') in ('anon', 'authenticated')
     and not es_equipo();
$$;
revoke all on function public.web_cerrada() from public, anon, authenticated;

create or replace function public.frenar_web_cerrada()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if web_cerrada() then
    raise exception '%', case (select datos ->> 'estadoWeb' from ajustes where clave = 'web')
      when 'demo' then 'La web está en modo demostración: puedes probarlo todo, pero no se ha guardado nada.'
      else 'La web está en mantenimiento. Vuelve en un rato.' end;
  end if;
  return coalesce(new, old);
end $$;
revoke all on function public.frenar_web_cerrada() from public, anon, authenticated;

drop trigger if exists web_cerrada on public.pedidos;
create trigger web_cerrada before insert or update on public.pedidos for each row execute function public.frenar_web_cerrada();
drop trigger if exists web_cerrada on public.tickets;
create trigger web_cerrada before insert or update on public.tickets for each row execute function public.frenar_web_cerrada();
drop trigger if exists web_cerrada on public.mensajes;
create trigger web_cerrada before insert or update on public.mensajes for each row execute function public.frenar_web_cerrada();
drop trigger if exists web_cerrada on public.candidaturas;
create trigger web_cerrada before insert or update on public.candidaturas for each row execute function public.frenar_web_cerrada();
drop trigger if exists web_cerrada on public.resenas;
create trigger web_cerrada before insert or update on public.resenas for each row execute function public.frenar_web_cerrada();
drop trigger if exists web_cerrada on public.videos;
create trigger web_cerrada before insert or update on public.videos for each row execute function public.frenar_web_cerrada();
