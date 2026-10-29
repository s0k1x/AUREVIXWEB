-- ==========================================================
--  v59 · Permisos de las funciones de correo (ya aplicado)
--  «notificar» (avisos por correo) y «correo» (recibos) leen la base de
--  datos con la clave de servidor (service_role). Sin estos permisos
--  fallaban con «permission denied» y no salía ningún correo.
-- ==========================================================
grant usage on schema public to service_role;
grant select on public.avisos, public.perfiles, public.pedidos, public.privado to service_role;
grant update on public.avisos to service_role;
