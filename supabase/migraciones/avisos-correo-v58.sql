-- ==========================================================
--  v58 · Avisos también por correo
--  Cada aviso nuevo de la campana llama a la función «notificar»,
--  que decide si manda un correo (preferencias de la persona y
--  como mucho uno cada 30 minutos por proyecto y tipo).
--  Pegar una vez en Supabase → SQL Editor → Run.
-- ==========================================================
create extension if not exists pg_net with schema extensions;

create or replace function public.aviso_por_correo() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url := 'https://jmmwuiuhwxgwnyqectcb.supabase.co/functions/v1/notificar',
    body := jsonb_build_object('aviso', new.id),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return new;
exception when others then
  return new; -- si falla el correo, el aviso se crea igual
end $$;

revoke execute on function public.aviso_por_correo() from public, anon, authenticated;

drop trigger if exists aviso_por_correo on public.avisos;
create trigger aviso_por_correo after insert on public.avisos
  for each row execute function public.aviso_por_correo();
