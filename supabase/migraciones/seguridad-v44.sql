-- ==========================================================
--  v44 · SEGURIDAD: funciones internas fuera del alcance público
--  Estas funciones solo las usan los disparadores (triggers) de la
--  base de datos. Antes se podían llamar desde fuera (/rest/v1/rpc/…),
--  incluso sin iniciar sesión: por ejemplo, «avisar» permitía mandar
--  avisos falsos a la campana de cualquier usuario.
--  Los disparadores siguen funcionando igual (no necesitan este permiso).
--  Se puede repetir sin problema. Para deshacerlo: GRANT EXECUTE … TO anon, authenticated.
--  Siguen siendo públicas (las necesitan los permisos y el pedido):
--  es_equipo, es_propietario, es_mi_pedido y cupon.
-- ==========================================================
revoke execute on function public.avisar(uuid, text, uuid, text) from public, anon, authenticated;
revoke execute on function public.avisos_mensaje() from public, anon, authenticated;
revoke execute on function public.avisos_pedido() from public, anon, authenticated;
revoke execute on function public.avisos_ticket() from public, anon, authenticated;
revoke execute on function public.avisos_video() from public, anon, authenticated;
revoke execute on function public.limitar_cliente() from public, anon, authenticated;
revoke execute on function public.nuevo_usuario() from public, anon, authenticated;
revoke execute on function public.proteger_rol() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.uids_propietarios() from public, anon, authenticated;

-- Índices para las búsquedas por usuario (los recomienda Supabase)
create index if not exists mensajes_uid on public.mensajes (uid);
create index if not exists resenas_uid on public.resenas (uid);
