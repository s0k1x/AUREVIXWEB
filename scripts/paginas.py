#!/usr/bin/env python3
"""
Genera las páginas de contenido de AurevixWeb (SEO):
  - Webs por sector (webs-para-barberias.html, …)
  - Guías (guias.html y cada guía)
  - Revisa tu web gratis (revisa-tu-web.html)
  - Mantenimiento mensual (mantenimiento.html)

Uso:  python3 scripts/paginas.py
Toma la cabecera común (metas, temas, idioma, splash) de terminos-y-privacidad.html,
así todas las páginas cargan igual. Los precios y plazos NO van escritos: se rellenan
al cargar desde config.js / Ajustes (atributos data-precio, data-entrega…), así nunca
se desactualizan. Si cambias un texto aquí, vuelve a ejecutar el script.
"""
import html
import json
import re
import subprocess
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DOMINIO = 'https://aurevixweb.es'
e = html.escape

# ---------- Trozos comunes sacados de una página existente ----------
base = (RAIZ / 'terminos-y-privacidad.html').read_text(encoding='utf-8')
lineas = base.split('\n')
def linea(prefijo):
    return next(l for l in lineas if l.strip().startswith(prefijo))
APARIENCIA = linea("<script>try{var a=JSON.parse(localStorage.getItem('tm_apariencia')")
RECARGA = linea('<script>/* Al recargar o volver atrás')
SINZOOM = linea('<script>/* Sin zoom')
SW = linea('<script>/* Versión nueva de la web')
INGLES = linea('<script>/* Inglés: se oculta la página')
I18N_CSS = linea('<style>html.i18n-pendiente body{visibility:hidden}')
SPLASH = linea('<div class="splash listo" id="splash0"')
SPLASH_JS = next(l for l in lineas if l.startswith("<script>(function(){var s=document.getElementById('splash0')"))
ICONOS = '\n'.join(l for l in lineas if re.match(r'\s*<link rel="(icon|apple-touch-icon|manifest)"', l) or 'name="theme-color"' in l)

CSS = ['fuentes/fuentes.css', 'css/style.css', 'css/componentes.css', 'css/animaciones.css', 'css/inicio.css', 'css/funciones.css',
       'css/tema-claro.css', 'css/pulido.css', 'css/temporadas.css', 'css/iconos-vivos.css', 'css/paginas.css']


def pagina(slug, titulo, desc, cuerpo, *, nombre_visita, ld=None, og='og.png?v=2', clase=''):
    url = f'{DOMINIO}/{slug}'
    ld_html = ''.join(f'\n  <script type="application/ld+json">{json.dumps(x, ensure_ascii=False, separators=(",", ":"))}</script>' for x in (ld or []))
    return f'''<!doctype html>
<!-- © AurevixWeb. Todos los derechos reservados. Prohibida la copia, reproducción o reutilización
     total o parcial de este diseño y de su código sin autorización escrita. Ver LICENSE.
     Página generada con scripts/paginas.py: cambia el texto allí y vuelve a generarla. -->
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
  <title>{e(titulo)}</title>
  <meta name="description" content="{e(desc)}">
{ICONOS}
  <link rel="canonical" href="{url}">
  <link rel="alternate" hreflang="es" href="{url}">
  <link rel="alternate" hreflang="x-default" href="{url}">
  <meta property="og:title" content="{e(titulo)}">
  <meta property="og:description" content="{e(desc)}">
  <meta property="og:image" content="{DOMINIO}/icons/{og}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:type" content="{'article' if 'guia' in clase else 'website'}">
  <meta property="og:url" content="{url}">
  <meta property="og:site_name" content="AurevixWeb">
  <meta property="og:locale" content="es_ES">
  <meta name="twitter:image" content="{DOMINIO}/icons/{og}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{e(titulo)}">
  <meta name="twitter:description" content="{e(desc)}">
  <meta name="copyright" content="© AurevixWeb. Todos los derechos reservados.">
{APARIENCIA}
{RECARGA}
  <link rel="preload" as="image" href="icons/logo-a.png">
  <link rel="preload" href="fuentes/instrument-sans-latin-046090.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="fuentes/bricolage-grotesque-latin-a97232.woff2" as="font" type="font/woff2" crossorigin>
{chr(10).join(f'  <link rel="stylesheet" href="{c}">' for c in CSS)}{ld_html}
{SINZOOM}
{SW}
{INGLES}
{I18N_CSS}
</head>
<body data-pagina="{nombre_visita}" class="{clase}">
{SPLASH}
{SPLASH_JS}
  <header id="header"></header>
  <main id="contenido">
{cuerpo}
  </main>
  <footer id="footer"></footer>
  <script type="module" src="js/portada/pagina.js"></script>
</body>
</html>
'''


def migas(*pares):
    """Migas de pan visibles + datos estructurados BreadcrumbList"""
    vis = ' <span aria-hidden="true">/</span> '.join(
        f'<a href="{h}">{e(t)}</a>' if h else f'<span aria-current="page">{e(t)}</span>' for t, h in pares)
    ld = {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i + 1, 'name': t, **({'item': f'{DOMINIO}/{h.lstrip("./")}'} if h else {})}
        for i, (t, h) in enumerate(pares)]}
    return f'<nav class="pg-migas" aria-label="Estás en">{vis}</nav>', ld


def faq_html(preguntas):
    return '<div class="faq">' + ''.join(f'<details><summary>{e(q)}</summary><p>{a}</p></details>' for q, a in preguntas) + '</div>'


def faq_ld(preguntas):
    limpia = lambda s: re.sub(r'<[^>]+>', '', s)
    return {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': limpia(a)}} for q, a in preguntas]}


# Valores de config.js como texto inicial (lo que ven Google y quien no tiene JavaScript);
# al cargar, js/portada/pagina.js los cambia por los de Ajustes si el propietario los ha cambiado.
_cfg = (RAIZ / 'config.js').read_text(encoding='utf-8')
PLANES = {m[0]: (int(m[1]), m[2]) for m in re.findall(r"id: '(\w+)', nombre: '[^']*', precio: (\d+), entrega: '([^']*)'", _cfg)}
EXTRAS = {m[0]: int(m[1]) for m in re.findall(r"\{ id: '(\w+)', nombre: '[^']*', precio: (\d+)", _cfg)}
eur = lambda n: f'{n:,}'.replace(',', '.') + ' €'
P = lambda plan: f'<span data-precio="{plan}">{eur(PLANES[plan][0])}</span>'      # precio de un tipo de web
ENT = lambda plan: f'<span data-entrega="{plan}">{e(PLANES[plan][1])}</span>'     # plazo de entrega
X = lambda extra: f'<span data-extra="{extra}">{eur(EXTRAS[extra])}</span>'       # precio de un extra


# ==========================================================
#  WEBS POR SECTOR
# ==========================================================
SECTORES = [
    dict(slug='webs-para-barberias', corto='Barberías y peluquerías', plantilla='filo', plan='negocio', alt='reservas',
         h1='Páginas web para barberías y peluquerías',
         lead='Tus servicios con precio y duración, fotos de tus cortes, horario y cómo llegar. Y, si quieres, citas online para que reserven sin llamar.',
         desc='Diseño de páginas web para barberías y peluquerías: servicios y precios, galería, horario, mapa y reserva de citas online. Precio cerrado.',
         puntos=[('scissors', 'Servicios con precio y duración', 'Corte, degradado, barba, combos… cada uno con su precio y cuánto dura, para que nadie tenga que preguntar.'),
                 ('calendar', 'Citas online', 'Con la Web con reservas tus clientes eligen servicio, día y hora, y a ti te llega un aviso de cada cita.'),
                 ('image', 'Galería de trabajos', 'Tus mejores cortes y tu local. Es lo primero que mira quien busca barbería nueva.'),
                 ('clock', 'Horario y mapa', 'Qué días abres, a qué hora y cómo llegar, siempre a mano desde el móvil.'),
                 ('phone', 'Llamar con un toque', 'Botón para llamar o escribir directamente desde la web.'),
                 ('search', 'Preparada para Google', 'Títulos, descripción y datos de tu negocio bien puestos para que te encuentren en tu zona.')],
         faq=[('¿Puedo tener citas online?', f'Sí. La <a href="./?comprar=reservas&amp;diseno=filo">Web con reservas</a> ({P("reservas")}) incluye un sistema de citas: tus clientes eligen servicio, día y hora, te llega un aviso de cada reserva y las ves todas en un panel.'),
              ('¿Necesito fotos profesionales?', 'No es imprescindible. Puedes subir tus fotos desde «Mis proyectos», en la pestaña «Archivos». Si todavía no tienes, puedes empezar con las del diseño y cambiarlas más adelante.'),
              ('¿Cuánto tarda en estar lista?', f'Una Web de negocio se entrega en {ENT("negocio")} y la Web con reservas en {ENT("reservas")}. Ves la fecha prevista en tu cuenta desde el primer día.'),
              ('¿Puedo ver el diseño antes de pagar?', 'Sí. Puedes abrir el diseño en vivo ahora mismo y, durante el proyecto, ves la vista previa de tu web antes de que se publique.')]),
    dict(slug='webs-para-centros-de-estetica', corto='Centros de estética', plantilla='calma', plan='reservas', alt='negocio',
         h1='Páginas web para centros de estética y bienestar',
         lead='Tus tratamientos con precio y duración, reserva online de citas, fotos del centro y cómo llegar. Una web tranquila, como tu centro.',
         desc='Páginas web para centros de estética, belleza y bienestar con reserva de citas online, tratamientos y precios. Precio cerrado.',
         puntos=[('sparkle', 'Tratamientos con precio', 'Faciales, masajes, manicura, depilación… cada tratamiento con su precio y su duración.'),
                 ('calendar', 'Reserva online de citas', 'Tus clientas reservan día y hora desde el móvil, a cualquier hora. Te llega un aviso de cada reserva.'),
                 ('image', 'Fotos del centro', 'Que vean el espacio antes de venir: da confianza y ayuda a decidir.'),
                 ('pin', 'Horario y ubicación', 'Horario por días y mapa para llegar sin perderse.'),
                 ('message', 'Contacto directo', 'Llamar, escribir o pedir información con un toque.'),
                 ('search', 'Preparada para Google', 'Para aparecer cuando buscan tratamientos en tu zona.')],
         faq=[('¿Cómo funcionan las reservas?', 'Tus clientas eligen tratamiento, día y hora en la web. A ti te llega un aviso de cada reserva y las ves todas en un panel.'),
              ('¿Y si no quiero reservas online?', f'Puedes empezar con la <a href="./?comprar=negocio&amp;diseno=calma">Web de negocio</a> ({P("negocio")}) con tus tratamientos, fotos, horario y contacto, y añadir las reservas más adelante.'),
              ('¿Cuánto tarda?', f'La Web con reservas se entrega en {ENT("reservas")}. Ves cada etapa y la fecha prevista desde tu cuenta.'),
              ('¿Puedo cambiar los colores del diseño?', 'Sí. El diseño de partida se adapta a tu marca: colores, logotipo, textos y fotos.')]),
    dict(slug='webs-para-restaurantes', corto='Restaurantes y bares', plantilla='brasa', plan='negocio', alt='tienda',
         h1='Páginas web para restaurantes y bares',
         lead='Tu carta con precios, fotos de los platos y del local, horario por días y un botón para reservar mesa llamando. Clara en el móvil, que es donde te buscan.',
         desc='Diseño de páginas web para restaurantes y bares: carta con precios, fotos, horario, ubicación y reservas por teléfono. Precio cerrado.',
         puntos=[('receipt', 'La carta, con precios', 'Entrantes, principales, postres… ordenada por secciones y fácil de leer en el móvil.'),
                 ('image', 'Fotos de platos y local', 'Lo que hace que alguien decida venir esta noche y no otro día.'),
                 ('clock', 'Horario por días', 'Comidas, cenas y días de cierre, sin dudas.'),
                 ('phone', 'Reservar con un toque', 'Botón para llamar y reservar mesa directamente desde la web.'),
                 ('pin', 'Cómo llegar', 'Dirección y mapa para quien viene por primera vez.'),
                 ('search', 'Preparada para Google', 'Para aparecer cuando buscan dónde comer cerca.')],
         faq=[('Si cambio la carta, ¿quién la actualiza?', f'Con el <a href="mantenimiento">mantenimiento mensual</a> ({X("mantenimiento")}/mes) te hacemos los cambios menores, como precios o platos nuevos. También puedes pedir cambios sueltos.'),
              ('¿Puedo vender para llevar?', f'Sí, con la <a href="./?comprar=tienda&amp;diseno=brasa">Tienda online</a> ({P("tienda")}): catálogo, carrito y pago por transferencia, sin comisiones de plataformas.'),
              ('¿Cuánto tarda?', f'Una Web de negocio se entrega en {ENT("negocio")}.'),
              ('¿Necesito tener dominio?', 'No hace falta tenerlo antes. En el cuestionario puedes añadir el dominio y el alojamiento del primer año, y lo registramos a tu nombre.')]),
    dict(slug='tiendas-online', corto='Tiendas online', plantilla='kiosko', plan='tienda', alt='negocio',
         h1='Tiendas online para vender sin comisiones',
         lead='Catálogo, carrito y pago por transferencia, con un panel para gestionar tus productos. Vendes desde tu propia web, sin pagar comisión por cada venta a un marketplace.',
         desc='Diseño de tiendas online para pequeños negocios: catálogo, carrito, pago por transferencia y panel de productos. Precio cerrado, sin comisiones.',
         puntos=[('bag', 'Catálogo y carrito', 'Tus productos con fotos, precio y descripción, y un carrito sencillo de usar.'),
                 ('bank', 'Pago por transferencia', 'El cliente ve los datos para pagar al terminar su pedido.'),
                 ('panel', 'Panel de productos', 'Para añadir, cambiar o quitar productos cuando lo necesites.'),
                 ('layers', 'Hasta 50 productos', 'Pensada para tiendas pequeñas y medianas. ¿Más? Te hacemos una a medida.'),
                 ('euro', 'Sin comisiones por venta', 'La tienda es tuya: no pagas un porcentaje de cada venta a una plataforma.'),
                 ('smartphone', 'Perfecta en el móvil', 'Donde se hacen la mayoría de las compras.')],
         faq=[('¿Qué formas de pago acepta?', 'Pago por transferencia bancaria: el cliente ve los datos al terminar su pedido.'),
              ('¿Cuántos productos puedo tener?', f'Hasta 50. Si necesitas más o funciones especiales, mira el plan <a href="./?comprar=medida">A medida</a> (desde {P("medida")}).'),
              ('¿Cuánto tarda?', f'Una tienda online se entrega en {ENT("tienda")}.'),
              ('¿Puedo cambiar los productos yo?', 'Sí, desde el panel de productos que incluye la tienda.')]),
    dict(slug='webs-para-gimnasios', corto='Gimnasios y deporte', plantilla='pulso', plan='negocio', alt='reservas',
         h1='Páginas web para gimnasios y centros deportivos',
         lead='Tarifas claras, fotos de las instalaciones, horario y cómo llegar. Y, si quieres, reserva de clases o sesiones online.',
         desc='Páginas web para gimnasios, boxes y centros deportivos: tarifas, instalaciones, horario y reservas online. Precio cerrado.',
         puntos=[('euro', 'Tarifas claras', 'Cada cuota con lo que incluye, para que comparen y se apunten sin dudas.'),
                 ('dumbbell', 'Instalaciones y clases', 'Fotos de la sala y de las actividades: es lo que convence.'),
                 ('calendar', 'Reservas online', 'Con la Web con reservas, tus socios reservan clase o sesión desde el móvil.'),
                 ('clock', 'Horario y mapa', 'Cuándo abre y cómo llegar, siempre a mano.'),
                 ('message', 'Contacto en un toque', 'Pedir información o una clase de prueba sin buscar el teléfono.'),
                 ('search', 'Preparada para Google', 'Para aparecer cuando buscan gimnasio en tu barrio.')],
         faq=[('¿Pueden reservar clases desde la web?', f'Sí, con la <a href="./?comprar=reservas&amp;diseno=pulso">Web con reservas</a> ({P("reservas")}): eligen día y hora y te llega un aviso de cada reserva.'),
              ('¿Cuánto tarda?', f'Una Web de negocio se entrega en {ENT("negocio")}; con reservas, en {ENT("reservas")}.'),
              ('¿Puedo cambiar las tarifas más adelante?', f'Sí. Con el <a href="mantenimiento">mantenimiento mensual</a> te hacemos los cambios menores, o puedes pedir cambios sueltos.'),
              ('¿Se puede instalar como app?', 'Sí. La Web de negocio se puede instalar en el móvil como una app (PWA).')]),
    dict(slug='webs-para-profesionales', corto='Profesionales y portfolios', plantilla='lienzo', plan='portfolio', alt='landing',
         h1='Webs y portfolios para profesionales',
         lead='Para fotógrafos, diseñadores, artistas y profesionales independientes: tus trabajos, quién eres, qué ofreces y cómo contactarte.',
         desc='Diseño de portfolios y webs para profesionales independientes: galería de proyectos, sobre mí, servicios y contacto. Precio cerrado.',
         puntos=[('image', 'Galería de proyectos', 'Tus mejores trabajos, grandes y bien ordenados.'),
                 ('user', 'Sobre ti', 'Quién eres y cómo trabajas: lo que hace que te elijan a ti.'),
                 ('briefcase', 'Servicios', 'Qué ofreces y para quién, claro y sin rodeos.'),
                 ('mail', 'Formulario de contacto', 'Para que te escriban con un encargo desde la propia web.'),
                 ('globe', 'Tu propio dominio', 'tunombre.com en vez de un perfil en una plataforma.'),
                 ('smartphone', 'Adaptada a móvil', 'Se ve perfecta en cualquier pantalla.')],
         faq=[('¿Portfolio o landing page?', f'El <a href="./?comprar=portfolio&amp;diseno=lienzo">Portfolio</a> ({P("portfolio")}) está pensado para enseñar muchos trabajos. Si solo necesitas presentar un servicio y recibir contactos, la <a href="./?comprar=landing&amp;diseno=lienzo">Landing page</a> ({P("landing")}) es suficiente.'),
              ('¿Cuánto tarda?', f'Un portfolio se entrega en {ENT("portfolio")}.'),
              ('¿Puedo añadir proyectos después?', 'Sí, con el mantenimiento mensual o pidiendo cambios sueltos.'),
              ('¿Me ayudáis con los textos?', f'Sí: en el cuestionario puedes añadir la redacción de textos ({X("textos")}).')]),
]

PASOS = [('Eliges', 'el tipo de web y este diseño de partida, y respondes un cuestionario corto.'),
         ('Pagas la señal', 'por Bizum o transferencia. El resto, cuando la web esté terminada y aprobada.'),
         ('Lo adaptamos', 'a tu marca: colores, logotipo, textos y fotos. Sigues cada etapa desde tu cuenta.'),
         ('Revisas y publicamos', 'Ves la vista previa, pides cambios y, cuando das el visto bueno, se publica.')]


def sector(s, todos):
    migas_html, migas_ld = migas(('Inicio', './'), ('Webs por sector', ''), (s['corto'], ''))
    migas_html = migas_html.replace('<span aria-current="page">Webs por sector</span>', '<span>Webs por sector</span>')
    migas_ld['itemListElement'] = [x for x in migas_ld['itemListElement'] if x['name'] != 'Webs por sector']
    for i, x in enumerate(migas_ld['itemListElement']):
        x['position'] = i + 1
    otros = ''.join(f'<a class="pg-otro" href="{o["slug"]}">{e(o["corto"])}<i data-i="arrow"></i></a>' for o in todos if o is not s)
    servicio = {'@context': 'https://schema.org', '@type': 'Service', 'name': s['h1'], 'description': s['desc'], 'areaServed': {'@type': 'Country', 'name': 'España'},
                'provider': {'@id': f'{DOMINIO}/#negocio', '@type': 'ProfessionalService', 'name': 'AurevixWeb', 'url': f'{DOMINIO}/'}}
    cuerpo = f'''    <section class="pg-hero">
      <div class="wrap pg-hero-grid">
        <div class="pg-hero-txt">
          {migas_html}
          <h1>{e(s["h1"])}</h1>
          <p class="lead">{e(s["lead"])}</p>
          <div class="pg-ctas">
            <a class="btn btn-primary" href="./?comprar={s["plan"]}&amp;diseno={s["plantilla"]}" data-magnet>Empezar con este diseño <i data-i="arrow"></i></a>
            <a class="btn btn-ghost" href="diseno?t={s["plantilla"]}" target="_blank" rel="noopener">Ver el diseño en vivo <i data-i="external"></i></a>
          </div>
          <ul class="pg-datos">
            <li><b>Desde {P(s["plan"])}</b><span data-iva>IVA incluido</span></li>
            <li><b>{ENT(s["plan"])}</b><span>plazo de entrega</span></li>
            <li><b>Precio cerrado</b><span>sin sorpresas</span></li>
          </ul>
        </div>
        <figure class="pg-marco" data-diseno="{s["plantilla"]}" aria-label="Vista previa del diseño de partida">
          <div class="pg-marco-bar" aria-hidden="true"><i></i><i></i><i></i><span></span></div>
          <div class="pg-marco-vista"></div>
        </figure>
      </div>
    </section>

    <section class="pg-sec">
      <div class="wrap">
        <div class="pg-sec-head"><h2>Lo que necesita la web de tu negocio</h2></div>
        <div class="pg-puntos">{"".join(f'<article class="pg-punto"><span class="pg-punto-ic"><i data-i="{ic}"></i></span><h3>{e(t)}</h3><p>{e(d)}</p></article>' for ic, t, d in s["puntos"])}</div>
      </div>
    </section>

    <section class="pg-sec alt">
      <div class="wrap pg-planes-grid">
        <div class="pg-sec-head"><h2>Elige el tipo de web</h2><p class="lead">Precio final, con el <span data-senal>50 %</span> al empezar y el resto a la entrega. Pagas por Bizum o transferencia.</p></div>
        <div class="pg-planes" data-planes="{s["plan"]},{s["alt"]}" data-diseno="{s["plantilla"]}"></div>
      </div>
    </section>

    <section class="pg-sec">
      <div class="wrap">
        <div class="pg-sec-head"><h2>De la idea a tu web publicada</h2></div>
        <ol class="pg-pasos">{"".join(f'<li><b>{e(t)}</b><span>{e(d)}</span></li>' for t, d in PASOS)}</ol>
      </div>
    </section>

    <section class="pg-sec alt">
      <div class="wrap faq-grid">
        <div class="faq-side pg-sec-head"><h2>Dudas frecuentes</h2><p class="lead">¿No está la tuya? <a href="./#contacto">Escríbenos</a> y te respondemos por correo.</p></div>
        {faq_html(s["faq"])}
      </div>
    </section>

    <section class="pg-sec pg-cierre">
      <div class="wrap">
        <h2>¿Empezamos tu web?</h2>
        <p class="lead">Elige el diseño, responde unas preguntas y ve el precio exacto antes de confirmar.</p>
        <div class="pg-ctas"><a class="btn btn-primary" href="./?comprar={s["plan"]}&amp;diseno={s["plantilla"]}">Empezar ahora <i data-i="arrow"></i></a><a class="btn btn-ghost" href="revisa-tu-web">¿Ya tienes web? Revísala gratis</a></div>
        <nav class="pg-otros" aria-label="Webs para otros sectores"><b>Otros sectores</b>{otros}</nav>
      </div>
    </section>'''
    return pagina(s['slug'], f'{s["h1"]} · AurevixWeb', s['desc'], cuerpo, nombre_visita=s['slug'][:40],
                  ld=[servicio, migas_ld, faq_ld(s['faq'])])


# ==========================================================
#  GUÍAS
# ==========================================================
def guia(slug, titulo, desc, resumen, secciones, *, extra_fin='', faq=None):
    migas_html, migas_ld = migas(('Inicio', './'), ('Guías', 'guias'), (titulo, ''))
    indice = ''.join(f'<a href="#{i}">{e(t)}</a>' for i, t, _ in secciones)
    cuerpo_secs = ''.join(f'<h2 id="{i}">{e(t)}</h2>{c}' for i, t, c in secciones)
    articulo = {'@context': 'https://schema.org', '@type': 'Article', 'headline': titulo, 'description': desc, 'inLanguage': 'es-ES',
                'author': {'@type': 'Organization', 'name': 'AurevixWeb', 'url': f'{DOMINIO}/'},
                'publisher': {'@id': f'{DOMINIO}/#negocio', '@type': 'Organization', 'name': 'AurevixWeb', 'logo': {'@type': 'ImageObject', 'url': f'{DOMINIO}/icons/icon-512.png'}},
                'mainEntityOfPage': f'{DOMINIO}/{slug}', 'image': f'{DOMINIO}/icons/og.png?v=2'}
    cuerpo = f'''    <article class="wrap guia">
      <header class="guia-cab">
        {migas_html}
        <h1>{e(titulo)}</h1>
        <p class="lead">{e(resumen)}</p>
      </header>
      <div class="guia-grid">
        <nav class="guia-ind" aria-label="En esta guía"><b>En esta guía</b>{indice}</nav>
        <div class="guia-cuerpo">
{cuerpo_secs}
{extra_fin}
          <aside class="guia-cta">
            <b>¿Quieres que te la hagamos?</b>
            <p>Precio cerrado, diseño de partida adaptado a tu marca y cada etapa a la vista en tu cuenta.</p>
            <div class="pg-ctas"><a class="btn btn-primary" href="./#webs">Ver webs y precios <i data-i="arrow"></i></a><a class="btn btn-ghost" href="revisa-tu-web">Revisa tu web gratis</a></div>
          </aside>
          <nav class="pg-otros" aria-label="Más guías"><b>Más guías</b>{"".join(f'<a class="pg-otro" href="{g[0]}">{e(g[1])}<i data-i="arrow"></i></a>' for g in GUIAS_LISTA if g[0] != slug)}</nav>
        </div>
      </div>
    </article>'''
    ld = [articulo, migas_ld] + ([faq_ld(faq)] if faq else [])
    return pagina(slug, f'{titulo} · AurevixWeb', desc, cuerpo, nombre_visita=slug[:40], ld=ld, clase='guia-pag')


GUIAS_LISTA = [
    ('cuanto-cuesta-una-pagina-web', '¿Cuánto cuesta una página web para un negocio?', 'De qué depende el precio, qué gastos se repiten cada año y qué preguntar antes de contratar.', 'euro'),
    ('que-necesita-la-web-de-mi-negocio', 'Qué necesita la web de tu negocio', 'Lo imprescindible para que una web atraiga clientes, y lo que cambia según el tipo de negocio.', 'bulb'),
    ('dominio-alojamiento-y-correo', 'Dominio, alojamiento y correo: qué es cada cosa', 'Explicado sin tecnicismos: qué necesitas, a nombre de quién y cuánto cuesta.', 'globe'),
    ('antes-de-lanzar-tu-web', '20 comprobaciones antes de lanzar tu web', 'La lista que revisamos en cada web antes de publicarla. Márcala punto a punto.', 'check'),
    ('seo-local-para-negocios', 'SEO local: cómo aparecer en Google en tu zona', 'Lo que hace que Google te enseñe cuando alguien busca lo tuyo cerca: ficha, web y reseñas.', 'pin'),
    ('como-conseguir-resenas-en-google', 'Cómo conseguir reseñas en Google (sin trucos)', 'Cuándo pedirlas, cómo ponérselo fácil al cliente y cómo responder, también a las malas.', 'star'),
    ('web-o-redes-sociales', '¿Web o solo redes sociales?', 'Para qué sirve cada cosa y por qué un negocio necesita algo que sea suyo.', 'globe'),
]

G1 = guia('cuanto-cuesta-una-pagina-web', GUIAS_LISTA[0][1],
    'Cuánto cuesta una página web para un negocio: de qué depende el precio, gastos anuales (dominio, alojamiento, correo, mantenimiento) y qué preguntar antes de contratar.',
    'No hay un precio único: depende de lo que tiene que hacer la web. Aquí tienes de qué depende, nuestros precios cerrados y los gastos que se repiten después.',
    [('depende', 'De qué depende el precio', '''
          <p>Una web para un negocio puede ser una sola página que presenta lo que haces o una tienda con cientos de productos. Lo que más cambia el precio es:</p>
          <ul>
            <li><b>Cuántas páginas o secciones tiene.</b> No es lo mismo una página única que una web con servicios, galería, equipo y contacto.</li>
            <li><b>Qué tiene que hacer.</b> Reservar citas, vender online o tener un área de clientes son funciones que llevan más trabajo que enseñar información.</li>
            <li><b>Si parte de un diseño o se hace desde cero.</b> Partir de un diseño probado y adaptarlo a tu marca es más rápido (y más barato) que diseñar todo desde una hoja en blanco.</li>
            <li><b>Quién pone los textos y las fotos.</b> Si los tienes tú, perfecto; si hay que redactarlos o crear un logotipo, se suma.</li>
            <li><b>Idiomas.</b> Cada idioma más es trabajo de traducción y de revisión.</li>
          </ul>'''),
     ('precios', 'Nuestros precios', '''
          <p>Todos son precios cerrados: sabes el total antes de confirmar y no cambia a mitad del proyecto. Se paga la señal al empezar y el resto cuando la web está terminada y la has aprobado.</p>
          <div class="guia-tabla" data-tabla-planes></div>
          <p>Los extras (dominio, logotipo, textos, idiomas, SEO avanzado…) se eligen en el cuestionario y ves el total exacto antes de pagar.</p>'''),
     ('anuales', 'Gastos que se repiten', f'''
          <p>Además del precio de la web, hay gastos que se repiten. Conviene tenerlos claros desde el principio:</p>
          <ul>
            <li><b>Dominio y alojamiento.</b> La dirección de tu web (tunegocio.es) y el sitio donde vive. Se renuevan cada año. Nosotros los dejamos listos el primer año por {X("dominio")}.</li>
            <li><b>Correo con tu dominio</b> (info@tunegocio.es): {X("correo")} al mes. Opcional: puedes seguir usando tu Gmail.</li>
            <li><b>Mantenimiento</b>: {X("mantenimiento")} al mes. Opcional y sin permanencia: cambios menores, actualizaciones y copias de seguridad. <a href="mantenimiento">Qué incluye</a>.</li>
          </ul>'''),
     ('preguntas', 'Qué preguntar antes de contratar', '''
          <ol>
            <li><b>¿El precio es cerrado?</b> Que te digan el total antes de empezar, con todo lo que incluye.</li>
            <li><b>¿Cuándo estará lista?</b> Una fecha, no un «pronto».</li>
            <li><b>¿Cuántas revisiones incluye?</b> Debes poder pedir cambios antes de que se publique.</li>
            <li><b>¿A nombre de quién va el dominio?</b> Siempre al tuyo: es la dirección de tu negocio.</li>
            <li><b>¿Qué pasa después?</b> Quién hace los cambios, cuánto cuestan y si hay permanencia.</li>
          </ol>''')])

G2 = guia('que-necesita-la-web-de-mi-negocio', GUIAS_LISTA[1][1],
    'Qué debe tener la web de un negocio local: qué ofreces, precios, fotos reales, contacto en un toque, horario, Google y textos legales. Con ejemplos por sector.',
    'Una web de negocio tiene un trabajo: que quien llega entienda qué haces y te contacte. Esto es lo que no puede faltar.',
    [('basico', 'Lo imprescindible', '''
          <ol>
            <li><b>Qué haces, en cinco segundos.</b> Un titular claro arriba del todo: qué ofreces y dónde.</li>
            <li><b>Servicios y precios.</b> Aunque sea «desde». Quien no encuentra el precio, muchas veces se va.</li>
            <li><b>Fotos reales.</b> Tu local, tu equipo, tus trabajos. Dan más confianza que cualquier texto.</li>
            <li><b>Contacto en un toque.</b> Llamar, escribir o reservar sin tener que buscar.</li>
            <li><b>Horario y ubicación.</b> Con mapa, y fácil de ver desde el móvil.</li>
            <li><b>Opiniones.</b> Las de tus clientes de verdad. Nunca inventadas.</li>
          </ol>'''),
     ('movil', 'Pensada para el móvil', '''
          <p>Casi todas las visitas a la web de un negocio local llegan desde el móvil. Por eso los botones tienen que poder pulsarse con el pulgar, el texto leerse sin hacer zoom y la página cargar rápido aunque la conexión no sea buena.</p>'''),
     ('google', 'Que te encuentren en Google', '''
          <ul>
            <li><b>Título y descripción de cada página</b>, con lo que haces y tu zona.</li>
            <li><b>Ficha de Google (Perfil de Empresa)</b> con la misma dirección, horario y teléfono que la web.</li>
            <li><b>Datos estructurados</b>: la información de tu negocio en el formato que entiende Google.</li>
            <li><b>Que cargue rápido</b>: Google lo tiene en cuenta. <a href="revisa-tu-web">Revisa la tuya gratis</a>.</li>
          </ul>'''),
     ('legal', 'Los textos legales', '''
          <p>En España, una web de negocio necesita, como mínimo, un <b>aviso legal</b> con los datos del titular, una <b>política de privacidad</b> si recoge datos (por ejemplo, con un formulario) y una <b>política de cookies</b>, con el aviso para aceptarlas si usa cookies que no son técnicas.</p>'''),
     ('sector', 'Según tu tipo de negocio', '''
          <ul>
            <li><a href="webs-para-barberias">Barberías y peluquerías</a>: servicios con duración, galería y citas online.</li>
            <li><a href="webs-para-centros-de-estetica">Centros de estética</a>: tratamientos y reserva de citas.</li>
            <li><a href="webs-para-restaurantes">Restaurantes y bares</a>: la carta, fotos y reservar llamando.</li>
            <li><a href="tiendas-online">Tiendas online</a>: catálogo, carrito y pago.</li>
            <li><a href="webs-para-gimnasios">Gimnasios</a>: tarifas, instalaciones y reservas de clases.</li>
            <li><a href="webs-para-profesionales">Profesionales</a>: portfolio, servicios y contacto.</li>
          </ul>''')])

G3 = guia('dominio-alojamiento-y-correo', GUIAS_LISTA[2][1],
    'Qué es un dominio, qué es el alojamiento (hosting), qué es el correo con tu dominio y el certificado HTTPS. Explicado sin tecnicismos y a nombre de quién debe ir.',
    'Son tres cosas distintas que suelen venderse juntas. Así es más fácil saber qué necesitas.',
    [('dominio', 'El dominio: tu dirección', '''
          <p>Es el nombre de tu web: <b>tunegocio.es</b>. Se alquila por años y se renueva. Elige uno corto, fácil de decir en voz alta y, si puede ser, con el nombre de tu negocio. Para un negocio en España, <b>.es</b> y <b>.com</b> son las opciones más habituales.</p>
          <p><b>Importante:</b> el dominio debe estar a tu nombre. Es la dirección de tu negocio; si un día cambias de proveedor, te la llevas.</p>'''),
     ('alojamiento', 'El alojamiento: dónde vive la web', '''
          <p>Los archivos de tu web tienen que estar en un servidor conectado a internet las 24 horas. Eso es el alojamiento (o <i>hosting</i>). Para la web de un negocio no necesitas nada complicado: que sea rápido, seguro y que haga copias de seguridad.</p>'''),
     ('https', 'El candado: HTTPS', '''
          <p>El candado que ves junto a la dirección significa que la conexión va cifrada. Hoy es obligatorio en la práctica: los navegadores avisan de que una web sin HTTPS «no es segura» y Google la tiene en cuenta.</p>'''),
     ('correo', 'El correo con tu dominio', f'''
          <p>En vez de <i>tunegocio@gmail.com</i>, <b>info@tunegocio.es</b>. Da más confianza y queda más profesional en presupuestos y facturas. No es obligatorio: puedes empezar con tu Gmail y añadirlo más adelante.</p>
          <p>Con nosotros, el correo con tu dominio cuesta {X("correo")} al mes y te lo dejamos configurado en el móvil y el ordenador.</p>'''),
     ('nosotros', 'Cómo lo hacemos nosotros', f'''
          <p>En el cuestionario puedes añadir <b>dominio y alojamiento del primer año</b> ({X("dominio")}): registramos el dominio a tu nombre y dejamos la web publicada con HTTPS. Si ya tienes dominio, lo usamos.</p>''')],
    faq=[('¿Puedo usar el dominio que ya tengo?', 'Sí. Si ya tienes un dominio, lo usamos para tu web nueva.'),
         ('¿A nombre de quién va el dominio?', 'Al tuyo. Es la dirección de tu negocio y debe ser tuya.')])

CHECKLIST = [
    ('Contenido', ['Se entiende qué haces en cinco segundos', 'Servicios y precios (aunque sea «desde»)', 'Fotos reales del negocio', 'Ningún texto de relleno ni enlace roto', 'Página 404 que lleva de vuelta a la web']),
    ('Móvil y velocidad', ['Se ve bien en el móvil sin hacer zoom', 'Botones fáciles de pulsar con el pulgar', 'Imágenes comprimidas', 'Carga en pocos segundos con datos móviles']),
    ('Google', ['Título y descripción en cada página', 'Datos estructurados del negocio', 'Sitemap.xml y robots.txt', 'Imagen para cuando se comparte (OpenGraph)', 'Ficha de Google con los mismos datos']),
    ('Legal y confianza', ['Aviso legal, privacidad y cookies', 'Aviso de cookies si usas cookies no técnicas', 'HTTPS (el candado)']),
    ('Contacto', ['Formulario que funciona y protegido contra spam', 'Llamar o escribir con un toque', 'Has probado todo como si fueras un cliente']),
]
G4 = guia('antes-de-lanzar-tu-web', GUIAS_LISTA[3][1],
    'Lista de 20 comprobaciones antes de publicar una web de negocio: contenido, móvil, velocidad, Google, textos legales y contacto. Interactiva.',
    'Antes de publicar cualquier web la revisamos con esta lista. Márcala punto a punto: el progreso se queda solo en tu pantalla.',
    [('lista', 'La lista', '<div class="chk" data-checklist>' + ''.join(
        f'<fieldset class="chk-grupo"><legend>{e(g)}</legend>' + ''.join(f'<label class="chk-it"><input type="checkbox"><span>{e(t)}</span></label>' for t in items) + '</fieldset>'
        for g, items in CHECKLIST) + '<div class="chk-prog" aria-live="polite"><div class="chk-barra"><i></i></div><b data-chk-n>0 de 20</b></div></div>'),
     ('ayuda', '¿Te faltan puntos?', '''
          <p>La parte técnica (velocidad, Google, accesibilidad) puedes comprobarla en un minuto con nuestra <a href="revisa-tu-web">revisión gratuita</a>. Si quieres, te enviamos un presupuesto para dejarla perfecta.</p>''')])
assert sum(len(i) for _, i in CHECKLIST) == 20

G5 = guia('seo-local-para-negocios', 'SEO local: cómo aparecer en Google en tu zona',
    'Guía de SEO local para negocios: ficha de Google (Perfil de Empresa), datos iguales en todas partes, reseñas, una página por servicio y velocidad.',
    'Cuando alguien busca «barbería cerca de mí» o «restaurante en Triana», Google enseña primero el mapa con tres negocios. Esto es lo que más influye para que salga el tuyo.',
    [('ficha', 'La ficha de Google (Perfil de Empresa)', """
          <p>Es lo primero que aparece en el mapa. Créala gratis en <b>business.google.com</b> y complétala entera:</p>
          <ul>
            <li><b>Categoría principal</b> exacta (por ejemplo, «Barbería», no solo «Peluquería»).</li>
            <li>Dirección, teléfono, horario (también los festivos) y la <b>dirección de tu web</b>.</li>
            <li>Fotos reales del local, del equipo y de tu trabajo. Súbelas de vez en cuando.</li>
            <li>Los servicios o la carta, con precios si puedes.</li>
          </ul>"""),
     ('datos', 'Los mismos datos en todas partes', """
          <p>Nombre, dirección y teléfono tienen que ser <b>idénticos</b> en tu web, en la ficha de Google, en redes y en directorios. Si en un sitio pone «C/ Mayor 12» y en otro «Calle Mayor, nº 12, bajo», Google duda de cuál es la buena.</p>"""),
     ('web', 'Lo que tiene que tener tu web', """
          <ul>
            <li><b>Tu ciudad o barrio</b> en el título y en los textos, de forma natural: «Barbería en el centro de Sevilla».</li>
            <li>Una <b>sección o página por cada servicio</b> importante, para que Google sepa todo lo que haces.</li>
            <li><b>Datos estructurados</b> del negocio (dirección, horario, tipo de negocio): Google los lee directamente.</li>
            <li>Que <b>cargue rápido en el móvil</b>. <a href="revisa-tu-web">Revisa la tuya gratis</a>.</li>
          </ul>"""),
     ('resenas', 'Las reseñas', """
          <p>Cuantas más reseñas reales y recientes, y mejor respondidas, más confianza da tu ficha a Google y a quien la mira. En <a href="como-conseguir-resenas-en-google">esta guía</a> te contamos cómo conseguirlas.</p>"""),
     ('paciencia', 'Cuánto tarda', """
          <p>No es inmediato: los cambios suelen notarse en semanas o meses. Lo bueno es que lo que construyes se queda: no dejas de aparecer el día que dejas de pagar anuncios.</p>""")])

G6 = guia('como-conseguir-resenas-en-google', 'Cómo conseguir reseñas en Google (sin trucos)',
    'Cómo conseguir reseñas reales en Google para tu negocio: cuándo pedirlas, el enlace directo, qué decir y cómo responder a las negativas.',
    'Las reseñas son lo que más convence a alguien que no te conoce. Conseguirlas no tiene secreto: pedirlas en el momento justo y ponerlo fácil.',
    [('cuando', 'Pídelas en el mejor momento', """
          <p>Justo cuando el cliente está contento: al terminar el servicio, al entregar el pedido o cuando te da las gracias. Una semana después ya no se acuerda.</p>"""),
     ('facil', 'Pónselo fácil: el enlace directo', """
          <ol>
            <li>En tu Perfil de Empresa de Google, busca <b>«Pedir reseñas»</b> o <b>«Compartir perfil»</b>: te da un enlace que abre directamente la ventana para escribir la reseña.</li>
            <li>Mándalo por WhatsApp o ponlo en un <b>código QR</b> en el mostrador o en el ticket.</li>
            <li>Un mensaje corto basta: «Gracias por venir. Si te ha gustado, nos ayudaría mucho una reseña: [enlace]».</li>
          </ol>"""),
     ('responder', 'Responde a todas', """
          <p>A las buenas, con un agradecimiento personal (no copia y pega). A las malas, con calma: agradece, reconoce lo que haya pasado y ofrece una solución por privado. Quien lee tu respuesta es el próximo cliente, no solo el que se quejó.</p>"""),
     ('no', 'Lo que no debes hacer', """
          <ul>
            <li><b>No compres reseñas ni las inventes</b>: va contra las normas de Google y la ley española lo considera una práctica desleal. Google las borra y puede penalizar la ficha.</li>
            <li>No ofrezcas descuentos a cambio de reseñas positivas.</li>
            <li>No pidas a familiares y amigos que dejen reseñas como si fueran clientes.</li>
          </ul>"""),
     ('web', 'Llévalas también a tu web', """
          <p>Enseña tus reseñas en la web con un enlace a la ficha de Google, para que quien llega a tu web vea que son reales.</p>""")])

G7 = guia('web-o-redes-sociales', '¿Web o solo redes sociales?',
    'Web o redes sociales para un negocio: qué aporta cada una, por qué conviene tener algo propio y cómo se complementan.',
    'Las redes son estupendas para que te conozcan. Pero tu negocio no debería depender solo de un sitio que no es tuyo.',
    [('redes', 'Para qué sirven las redes', """
          <p>Para enseñar el día a día, crear comunidad y que te descubran. Son rápidas y gratis. El problema es que las reglas las pone otro: cambian el algoritmo, te limitan el alcance o te bloquean la cuenta, y no puedes hacer nada.</p>"""),
     ('web', 'Para qué sirve la web', """
          <ul>
            <li><b>Es tuya</b>: tu dirección, tu contenido y tus clientes, sin depender de nadie.</li>
            <li><b>Te encuentran en Google</b> cuando alguien busca lo que haces, aunque no te siga.</li>
            <li><b>Toda la información en un sitio</b>: servicios, precios, horario, cómo llegar y cómo reservar.</li>
            <li><b>Da confianza</b>: muchos clientes buscan la web antes de decidirse.</li>
          </ul>"""),
     ('juntas', 'Lo mejor: que se ayuden', """
          <p>Usa las redes para atraer y la web para convertir: en cada publicación, el enlace a tu web para reservar, pedir o ver los precios. Y en tu web, enlaces a tus redes para que te sigan.</p>"""),
     ('empezar', 'Si estás empezando', """
          <p>No hace falta una web enorme: una <a href="./?comprar=landing">landing page</a> con lo esencial ya marca la diferencia. Mira <a href="cuanto-cuesta-una-pagina-web">cuánto cuesta</a> y qué incluye cada tipo de web.</p>""")])

INDICE_GUIAS = pagina('guias', 'Guías para la web de tu negocio · AurevixWeb',
    'Guías claras para la web de tu negocio: cuánto cuesta, qué necesita, dominio y correo, y la lista de comprobaciones antes de lanzar.',
    f'''    <section class="pg-hero pg-hero-corto">
      <div class="wrap">
        {migas(('Inicio', './'), ('Guías', ''))[0]}
        <h1>Guías para la web de tu negocio</h1>
        <p class="lead">Lo que conviene saber antes de hacer (o rehacer) tu web, sin tecnicismos.</p>
      </div>
    </section>
    <section class="pg-sec">
      <div class="wrap pg-guias">
        {"".join(f'<a class="pg-guia" href="{s}"><span class="pg-punto-ic"><i data-i="{ic}"></i></span><h2>{e(t)}</h2><p>{e(d)}</p><span class="pg-guia-ir">Leer la guía <i data-i="arrow"></i></span></a>' for s, t, d, ic in GUIAS_LISTA)}
        <a class="pg-guia pg-guia-revisa" href="revisa-tu-web"><span class="pg-punto-ic"><i data-i="search"></i></span><h2>Revisa tu web gratis</h2><p>Velocidad, Google, accesibilidad y buenas prácticas de tu web, en un minuto.</p><span class="pg-guia-ir">Revisar mi web <i data-i="arrow"></i></span></a>
      </div>
    </section>''', nombre_visita='guias', ld=[migas(('Inicio', './'), ('Guías', ''))[1]])


# ==========================================================
#  REVISA TU WEB GRATIS
# ==========================================================
REVISA = pagina('revisa-tu-web', 'Revisa tu web gratis: velocidad, Google y accesibilidad · AurevixWeb',
    'Revisión gratuita de tu página web: velocidad en el móvil, SEO para Google, accesibilidad y buenas prácticas, con lo que conviene mejorar.',
    f'''    <section class="pg-hero pg-hero-corto">
      <div class="wrap">
        {migas(('Inicio', './'), ('Revisa tu web', ''))[0]}
        <h1>Revisa tu web gratis</h1>
        <p class="lead">Escribe la dirección de tu web y te decimos cómo va en el móvil: velocidad, Google, accesibilidad y buenas prácticas, con lo que conviene mejorar.</p>
        <form class="rv-form" id="rvForm" novalidate>
          <label class="rv-campo"><i data-i="globe"></i><input id="rvUrl" type="url" inputmode="url" autocomplete="url" placeholder="tunegocio.es" aria-label="Dirección de tu web" required></label>
          <button class="btn btn-primary" type="submit" id="rvBtn">Revisar <i data-i="arrow"></i></button>
        </form>
        <p class="rv-nota">Usamos la herramienta pública PageSpeed Insights de Google. No guardamos la dirección que escribes.</p>
      </div>
    </section>
    <section class="pg-sec rv-res" id="rvRes" hidden aria-live="polite"></section>''',
    nombre_visita='revisa-tu-web', ld=[migas(('Inicio', './'), ('Revisa tu web', ''))[1]])


# ==========================================================
#  MANTENIMIENTO MENSUAL
# ==========================================================
MANT_FAQ = [('¿Hay permanencia?', 'No. Se puede cancelar en cualquier momento, con efecto al final del mes en curso, escribiéndonos o desde «Ayuda y soporte».'),
            ('¿Desde cuándo se paga?', 'Se cobra cada mes desde que la web se publica.'),
            ('¿Qué es un cambio menor?', 'Cambiar textos, precios, fotos, horarios o avisos de lo que ya existe. Una sección nueva o un rediseño se presupuestan aparte.'),
            ('¿Cómo pido un cambio?', 'Desde «Mis proyectos», en la pestaña «Mensajes» de tu web, o desde «Ayuda y soporte». Así queda todo por escrito.'),
            ('¿Y si no lo contrato?', 'Tu web sigue funcionando igual. Cuando necesites un cambio, puedes pedirlo suelto.')]
MANT = pagina('mantenimiento', 'Mantenimiento mensual de tu web · AurevixWeb',
    'Mantenimiento mensual para la web de tu negocio: cambios menores, actualizaciones y copias de seguridad. Sin permanencia.',
    f'''    <section class="pg-hero pg-hero-corto">
      <div class="wrap pg-mant">
        <div>
          {migas(('Inicio', './'), ('Mantenimiento', ''))[0]}
          <h1>Tu web, siempre al día</h1>
          <p class="lead">Cambias un precio, un horario o una foto y nos lo pides: lo hacemos nosotros. Y mientras, mantenemos tu web actualizada y con copias de seguridad.</p>
          <div class="pg-ctas"><a class="btn btn-primary" href="./#webs">Añadirlo a mi web <i data-i="arrow"></i></a><a class="btn btn-ghost" href="./#contacto">Tengo una pregunta</a></div>
        </div>
        <div class="pg-mant-precio card"><small>Mantenimiento mensual</small><b>{X("mantenimiento")}<span>/mes</span></b><span data-iva>IVA incluido</span>
          <ul>{"".join(f'<li><i data-i="check"></i>{t}</li>' for t in ['Cambios menores: textos, precios, fotos y horarios', 'Actualizaciones de la web', 'Copias de seguridad', 'Lo pides por escrito desde tu cuenta', 'Sin permanencia'])}</ul>
        </div>
      </div>
    </section>
    <section class="pg-sec">
      <div class="wrap">
        <div class="pg-sec-head"><h2>Tú te ocupas de tu negocio</h2></div>
        <div class="pg-puntos">{"".join(f'<article class="pg-punto"><span class="pg-punto-ic"><i data-i="{ic}"></i></span><h3>{e(t)}</h3><p>{e(d)}</p></article>' for ic, t, d in [
            ('pen', 'Cambios menores', 'Nuevos precios, un horario de verano, una foto mejor, un aviso de vacaciones: nos lo pides y lo cambiamos.'),
            ('refresh', 'Actualizaciones', 'Mantenemos al día la web y lo que la hace funcionar.'),
            ('shield', 'Copias de seguridad', 'Si algo sale mal, se recupera.'),
            ('message', 'Todo por escrito', 'Pides los cambios desde «Mis proyectos» o «Ayuda y soporte», y queda registrado.'),
            ('mail', 'Correo con tu dominio', f'Si además quieres info@tunegocio.es, son {X("correo")} al mes más.'),
            ('calendar', 'Sin permanencia', 'Lo cancelas cuando quieras, con efecto al final del mes.')])}</div>
      </div>
    </section>
    <section class="pg-sec alt">
      <div class="wrap faq-grid">
        <div class="faq-side pg-sec-head"><h2>Dudas frecuentes</h2></div>
        {faq_html(MANT_FAQ)}
      </div>
    </section>''', nombre_visita='mantenimiento', ld=[migas(('Inicio', './'), ('Mantenimiento', ''))[1], faq_ld(MANT_FAQ)])


# ==========================================================
#  FICHA DE CADA DISEÑO (diseno-filo, diseno-calma…)
#  Los datos salen de js/portada/plantillas.js (con node), así la ficha nunca se queda atrás.
# ==========================================================
_dz = json.loads(subprocess.run(['node', '--input-type=module', '-e',
    "import { PLANTILLAS } from './js/portada/plantillas.js'; import { PLANES } from './config.js';"
    "console.log(JSON.stringify({ t: PLANTILLAS.map(({ id, nombre, dominio, sector, desc, fuentes, c, secciones }) => ({ id, nombre, dominio, sector, desc, fuentes: { d: fuentes.d, b: fuentes.b }, c, secciones: secciones.map(x => x.tipo) })),"
    " p: PLANES.map(({ id, plantillas }) => ({ id, plantillas })) }))"], cwd=RAIZ, capture_output=True, text=True, check=True).stdout)
DISENOS = _dz['t']
QUE_TRAE = {
    'lista': ('Lista de servicios y precios', 'Cada servicio con su precio y su duración, fácil de leer en el móvil.'),
    'precios': ('Tarifas', 'Tus bonos, cuotas o tarifas, claros y comparables.'),
    'galeria': ('Galería de fotos', 'Tus trabajos, tu local o tus platos, a pantalla completa.'),
    'opiniones': ('Opiniones de clientes', 'Las reseñas que ya tienes, con la nota media a la vista.'),
    'info': ('Horario y cómo llegar', 'Si estás abierto ahora, el horario de la semana y la dirección.'),
    'cta': ('Llamada final a reservar o escribir', 'Un último botón para que el visitante dé el paso.'),
    'ventajas': ('Por qué elegirte', 'Lo que te diferencia, en pocas palabras.'),
    'productos': ('Catálogo de productos', 'Fotos, precios y un carrito para comprar desde el móvil.'),
    'proyectos': ('Proyectos', 'Tus trabajos con foto grande, título y lo que hiciste.'),
    'sobre': ('Sobre ti', 'Quién está detrás, tu forma de trabajar y tu experiencia.'),
    'reserva': ('Reserva de cita', 'El cliente elige servicio, día y hora sin llamar.'),
}

def ficha(d):
    planes = [x['id'] for x in _dz['p'] if d['id'] in x['plantillas'] and x['id'] in PLANES]
    plan = planes[0] if planes else 'negocio'
    migas_html, migas_ld = migas(('Inicio', './'), ('Diseños', './#disenos'), (d['nombre'], ''))
    otros = ''.join(f'<a class="pg-otro" href="diseno-{o["id"]}">{e(o["nombre"])}<i data-i="arrow"></i></a>' for o in DISENOS if o is not d)
    trae = ''.join(f'<li><b>{e(QUE_TRAE[t][0])}</b><span>{e(QUE_TRAE[t][1])}</span></li>' for t in dict.fromkeys(['portada'] + d['secciones']) if t in QUE_TRAE)
    trae = f'<li><b>Portada con lo esencial</b><span>Qué haces, dónde y un botón claro para reservar, llamar o comprar.</span></li>{trae}<li><b>Contacto por WhatsApp, teléfono y correo</b><span>A un toque desde cualquier pantalla.</span></li>'
    colores = [('Fondo', d['c']['bg']), ('Superficie', d['c']['surface']), ('Acento', d['c']['accent']), ('Texto', d['c']['text'])]
    titulo = f'Diseño {d["nombre"]} para {d["sector"].split("·")[0].strip().lower()}'
    desc = f'{d["desc"]} Diseño de partida {d["nombre"]} de AurevixWeb, adaptado a tu marca y a precio cerrado.'
    producto = {'@context': 'https://schema.org', '@type': 'Service', 'name': titulo, 'description': desc, 'areaServed': {'@type': 'Country', 'name': 'España'},
                'provider': {'@id': f'{DOMINIO}/#negocio', '@type': 'ProfessionalService', 'name': 'AurevixWeb', 'url': f'{DOMINIO}/'}}
    cuerpo = f'''    <section class="pg-hero">
      <div class="wrap pg-hero-grid">
        <div class="pg-hero-txt">
          {migas_html}
          <h1>{e(titulo[0].upper() + titulo[1:])}</h1>
          <p class="lead">{e(d["desc"])} Lo adaptamos a tu marca: colores, textos, fotos y secciones.</p>
          <div class="pg-ctas">
            <a class="btn btn-primary" href="./?comprar={plan}&amp;diseno={d["id"]}" data-magnet>Quiero este diseño <i data-i="arrow"></i></a>
            <a class="btn btn-ghost" href="diseno?t={d["id"]}" target="_blank" rel="noopener">Verlo en vivo <i data-i="external"></i></a>
          </div>
          <ul class="pg-datos">
            <li><b>Desde {P(plan)}</b><span data-iva>IVA incluido</span></li>
            <li><b>{ENT(plan)}</b><span>plazo de entrega</span></li>
            <li><b>Precio cerrado</b><span>sin sorpresas</span></li>
          </ul>
        </div>
        <figure class="pg-marco" data-diseno="{d["id"]}" aria-label="Vista previa del diseño {e(d["nombre"])}">
          <div class="pg-marco-bar" aria-hidden="true"><i></i><i></i><i></i><span></span></div>
          <div class="pg-marco-vista"></div>
        </figure>
      </div>
    </section>

    <section class="pg-sec">
      <div class="wrap dzf-grid">
        <div class="pg-sec-head"><h2>Qué trae</h2><p class="lead">Las secciones con las que empieza. Quitamos, añadimos o reordenamos las que necesites.</p></div>
        <ul class="dzf-trae">{trae}</ul>
      </div>
    </section>

    <section class="pg-sec alt">
      <div class="wrap dzf-grid">
        <div class="pg-sec-head"><h2>Colores y letra</h2><p class="lead">Así viene de partida. Si tienes logotipo o colores de marca, lo cambiamos todo a los tuyos.</p></div>
        <div class="dzf-estilo">
          <ul class="dzf-colores">{"".join(f'<li><i style="background:{c}"></i><b>{n}</b><span>{c.upper()}</span></li>' for n, c in colores)}</ul>
          <div class="dzf-letras"><p><span>Titulares</span><b>{e(d["fuentes"]["d"])}</b></p><p><span>Texto</span><b>{e(d["fuentes"]["b"])}</b></p></div>
        </div>
      </div>
    </section>

    <section class="pg-sec">
      <div class="wrap pg-planes-grid">
        <div class="pg-sec-head"><h2>Tipos de web con este diseño</h2><p class="lead">Precio final, con el <span data-senal>50 %</span> al empezar y el resto a la entrega. Pagas por Bizum o transferencia.</p></div>
        <div class="pg-planes" data-planes="{",".join(planes[:2] or [plan])}" data-diseno="{d["id"]}"></div>
      </div>
    </section>

    <section class="pg-sec pg-cierre">
      <div class="wrap">
        <h2>¿Te quedas con {e(d["nombre"])}?</h2>
        <p class="lead">Responde unas preguntas sobre tu negocio y ve el precio exacto antes de confirmar.</p>
        <div class="pg-ctas"><a class="btn btn-primary" href="./?comprar={plan}&amp;diseno={d["id"]}">Quiero este diseño <i data-i="arrow"></i></a><a class="btn btn-ghost" href="./#disenos">Ver todos los diseños</a></div>
        <nav class="pg-otros" aria-label="Otros diseños"><b>Otros diseños</b>{otros}</nav>
      </div>
    </section>'''
    return pagina(f'diseno-{d["id"]}', f'{titulo[0].upper() + titulo[1:]} · AurevixWeb', desc, cuerpo, nombre_visita=f'dz-{d["id"]}', ld=[producto, migas_ld])


# ==========================================================
#  ESCRIBIR LOS ARCHIVOS Y EL SITEMAP
# ==========================================================
if __name__ == '__main__':
    salida = {s['slug']: sector(s, SECTORES) for s in SECTORES}
    salida.update({'guias': INDICE_GUIAS, 'cuanto-cuesta-una-pagina-web': G1, 'que-necesita-la-web-de-mi-negocio': G2,
                   'dominio-alojamiento-y-correo': G3, 'antes-de-lanzar-tu-web': G4, 'seo-local-para-negocios': G5, 'como-conseguir-resenas-en-google': G6, 'web-o-redes-sociales': G7, 'revisa-tu-web': REVISA, 'mantenimiento': MANT})
    salida.update({f'diseno-{d["id"]}': ficha(d) for d in DISENOS})
    for slug, h in salida.items():
        (RAIZ / f'{slug}.html').write_text(h, encoding='utf-8')
    urls = [('', 'weekly', '1.0'), *[(s, 'monthly', '0.8') for s in [x['slug'] for x in SECTORES]],
            *[(f'diseno-{d["id"]}', 'monthly', '0.7') for d in DISENOS], ('revisa-tu-web', 'monthly', '0.7'), ('mantenimiento', 'monthly', '0.6'), ('guias', 'monthly', '0.6'),
            *[(g[0], 'monthly', '0.6') for g in GUIAS_LISTA], ('trabaja-con-nosotros', 'monthly', '0.5'), ('terminos-y-privacidad', 'yearly', '0.3')]
    (RAIZ / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        ''.join(f'  <url><loc>{DOMINIO}/{u}</loc><changefreq>{f}</changefreq><priority>{p}</priority></url>\n' for u, f, p in urls) + '</urlset>\n', encoding='utf-8')
    print('Generadas:', ', '.join(salida))
