-- ==========================================================
--  v65 · ESTADÍSTICAS DE VISITAS PROPIAS (sin cookies ni terceros)
--  Se puede repetir sin problema. Pegar en Supabase → SQL Editor → Run.
--  - No se guarda nada de la persona: ni IP, ni identificadores, ni cookies.
--    Solo contadores por día, página, web de procedencia, tipo de
--    dispositivo e idioma.
--  - La web suma una visita con contar_visita(); nadie puede leer ni
--    tocar la tabla salvo el propietario (Panel → Resumen).
--  - Se borran solas a los 13 meses.
-- ==========================================================
create table if not exists public.visitas (
  dia date not null,
  pagina text not null check (pagina in ('inicio', 'trabaja', 'terminos')),
  origen text not null default '' check (char_length(origen) <= 60),
  dispositivo text not null check (dispositivo in ('movil', 'tablet', 'ordenador')),
  idioma text not null check (idioma in ('es', 'en')),
  visitas integer not null default 0,
  primary key (dia, pagina, origen, dispositivo, idioma)
);
alter table public.visitas enable row level security;

drop policy if exists vis_ver on public.visitas;
create policy vis_ver on public.visitas for select to authenticated using (es_propietario());

revoke all on public.visitas from anon, authenticated;
grant select on public.visitas to authenticated;
grant all on public.visitas to service_role;

create or replace function public.contar_visita(p_pagina text, p_origen text, p_dispositivo text, p_idioma text)
returns void language plpgsql security definer set search_path = public as $$
declare
  o text := lower(coalesce(p_origen, ''));
begin
  if p_pagina not in ('inicio', 'trabaja', 'terminos') or p_dispositivo not in ('movil', 'tablet', 'ordenador') or p_idioma not in ('es', 'en') then
    return;
  end if;
  if o !~ '^[a-z0-9.-]{0,60}$' then o := 'otro'; end if;
  -- Contra el abuso: como mucho 300 combinaciones distintas al día; el resto cuenta como «otro»
  if not exists (select 1 from visitas where dia = (now() at time zone 'Europe/Madrid')::date and pagina = p_pagina and origen = o and dispositivo = p_dispositivo and idioma = p_idioma)
     and (select count(*) from visitas where dia = (now() at time zone 'Europe/Madrid')::date) >= 300 then
    o := 'otro';
  end if;
  insert into visitas (dia, pagina, origen, dispositivo, idioma, visitas)
  values ((now() at time zone 'Europe/Madrid')::date, p_pagina, o, p_dispositivo, p_idioma, 1)
  on conflict (dia, pagina, origen, dispositivo, idioma) do update set visitas = visitas.visitas + 1;
  -- De vez en cuando, fuera lo de hace más de 13 meses
  if random() < 0.01 then delete from visitas where dia < current_date - 400; end if;
end $$;

revoke all on function public.contar_visita(text, text, text, text) from public;
grant execute on function public.contar_visita(text, text, text, text) to anon, authenticated;
