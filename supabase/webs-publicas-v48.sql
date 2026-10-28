-- ==========================================================
--  v48 · Webs de clientes en aurevixweb.es/<nombre>
--  El equipo «publica» una versión de la web de un pedido con un
--  nombre corto. Esa versión (y solo esa) se puede ver sin cuenta en
--  https://aurevixweb.es/<nombre>. Despublicar la vuelve privada.
--  Se puede repetir sin problema.
-- ==========================================================
create table if not exists public.webs_publicas (
  slug        text primary key check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$'),
  pedido_id   uuid not null references public.pedidos(id) on delete cascade,
  version_id  text not null check (version_id ~ '^[a-z0-9]{4,40}$'),
  prefijo     text generated always as (pedido_id::text || '/web/' || version_id || '/') stored,
  datos       jsonb not null default '{}'::jsonb,   -- { negocio, entrada, paginas, archivos:[{ruta,clave,tipo}] }
  creado      timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create unique index if not exists webs_publicas_pedido on public.webs_publicas (pedido_id);
alter table public.webs_publicas enable row level security;

drop policy if exists wp_ver on public.webs_publicas;
create policy wp_ver on public.webs_publicas for select to anon, authenticated using (true);
drop policy if exists wp_crear on public.webs_publicas;
create policy wp_crear on public.webs_publicas for insert to authenticated with check (es_equipo());
drop policy if exists wp_editar on public.webs_publicas;
create policy wp_editar on public.webs_publicas for update to authenticated using (es_equipo()) with check (es_equipo());
drop policy if exists wp_borrar on public.webs_publicas;
create policy wp_borrar on public.webs_publicas for delete to authenticated using (es_equipo());

grant select on public.webs_publicas to anon, authenticated;
grant insert, update, delete on public.webs_publicas to authenticated;

-- Archivos: además de lo de siempre, cualquiera puede leer los de una versión publicada
drop policy if exists arch_publica on storage.objects;
create policy arch_publica on storage.objects for select to anon, authenticated using (
  bucket_id = 'archivos'
  and exists (select 1 from public.webs_publicas w where starts_with(storage.objects.name, w.prefijo))
);
