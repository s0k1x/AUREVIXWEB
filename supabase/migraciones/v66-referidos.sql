-- ==========================================================
--  v66 · RECOMIENDA A UN AMIGO
--  Se puede repetir sin problema. Pegar en Supabase → SQL Editor → Run.
--  - Cada cliente con algún pedido tiene su código AMIGO-XXXXXXXX
--    (las 8 primeras cifras de su identificador, en mayúsculas).
--  - Quien lo usa en su PRIMERA web tiene el descuento de «referidos»
--    (Ajustes → Negocio; por defecto 10 %). No se acumula con otros cupones.
--  - No vale usar tu propio código.
--  - El premio para quien recomienda lo da el propietario desde el panel.
-- ==========================================================
create or replace function public.cupon(codigo text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(
    -- 1) Cupones de Ajustes → Cupones
    (select c from ajustes a, jsonb_array_elements(a.datos -> 'lista') c
      where a.clave = 'cupones'
        and upper(c ->> 'codigo') = upper(trim(codigo))
        and coalesce((c ->> 'activo')::boolean, true)
        and (coalesce(c ->> 'hasta', '') = '' or (c ->> 'hasta')::date >= current_date)
      limit 1),
    -- 2) Descuento de bienvenida (primera web)
    (select jsonb_build_object('codigo', b ->> 'codigo', 'pct', (b ->> 'pct')::numeric, 'primera', true)
      from (select coalesce((select datos -> 'bienvenida' from ajustes where clave = 'web'),
                            '{"activo": true, "codigo": "BIENVENIDA10", "pct": 10}'::jsonb) as b) x
      where coalesce((b ->> 'activo')::boolean, false)
        and upper(b ->> 'codigo') = upper(trim(codigo))
        and not exists (select 1 from pedidos p where p.uid = auth.uid() and coalesce(p.datos ->> 'estado', '') <> 'cancelado')),
    -- 3) Código de un amigo (primera web, no el tuyo)
    (select jsonb_build_object('codigo', upper(trim(codigo)), 'pct', coalesce((r ->> 'pct')::numeric, 10), 'primera', true, 'amigo', true)
      from (select coalesce((select datos -> 'referidos' from ajustes where clave = 'web'),
                            '{"activo": true, "pct": 10}'::jsonb) as r) x
      where coalesce((r ->> 'activo')::boolean, true)
        and upper(trim(codigo)) ~ '^AMIGO-[0-9A-F]{8}$'
        and auth.uid() is not null
        and upper(left(replace(auth.uid()::text, '-', ''), 8)) <> substr(upper(trim(codigo)), 7)
        and exists (select 1 from pedidos p
                     where upper(left(replace(p.uid::text, '-', ''), 8)) = substr(upper(trim(codigo)), 7)
                       and coalesce(p.datos ->> 'estado', '') <> 'cancelado')
        and not exists (select 1 from pedidos p where p.uid = auth.uid() and coalesce(p.datos ->> 'estado', '') <> 'cancelado'))
  );
$$;
-- Los permisos de la función se mantienen como estaban (create or replace no los cambia)
