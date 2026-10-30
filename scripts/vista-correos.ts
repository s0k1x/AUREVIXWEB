// Vista previa de los correos y de la factura, sin enviar nada.
// Uso: deno run -A scripts/vista-correos.ts <carpeta-salida> [url-base-para-imágenes]
import { correoCodigo, correoPago, pdfFactura } from '../supabase/functions/_shared/plantillas.ts';
const [salida = '.', base = ''] = Deno.args;
const local = (h: string) => base ? h.replaceAll('https://aurevixweb.es/icons/', `${base}/icons/`) : h;
const c = correoCodigo('974910', 'Jose García', false);
await Deno.writeTextFile(`${salida}/correo-codigo.html`, local(c.html));
const pedido = { total: 349, precioBase: 299, planNombre: 'Web de negocio', clienteNombre: 'Jose García', respuestas: { negocio: 'Barbería Filo' },
  extras: [{ nombre: 'Dominio + alojamiento (1.er año)', precio: 50 }, { nombre: 'Mantenimiento', precio: 19, mensual: true }], pagoMetodo: 'bizum', iva: 21 };
const e = { marca: 'AurevixWeb', email: 'aurevixweb@gmail.com', senal: 50, iva: 21, legal: { titular: 'Mario Señor Sevilla', nif: '12345678Z', domicilio: 'Calle Mayor 1, 28001 Madrid', email: 'aurevixweb@gmail.com' } };
const p = correoPago(pedido, '0f1e2d3c-4b5a-6978-8a9b-c0d1e2f3a4b5', 'senal', e, { razon: 'Barbería Filo S.L.', nif: 'B12345678' }, '2026-0007');
await Deno.writeTextFile(`${salida}/correo-pago.html`, local(p.html));
const logo = base ? new Uint8Array(await (await fetch(`${base}/icons/logo-a.png`)).arrayBuffer()) : undefined;
const pdf = await pdfFactura('2026-0007', {
  fecha: '30/10/2026', emisor: { titular: e.legal.titular, nif: e.legal.nif, domicilio: e.legal.domicilio, email: e.legal.email },
  cliente: { nombre: 'Barbería Filo S.L.', nif: 'B12345678', direccion: 'Calle del Pez 12', cp: '28004', ciudad: 'Madrid', email: 'jose@barberiafilo.com' },
  lineas: [{ concepto: 'Señal (50 %) del diseño y publicación de Web de negocio «Barbería Filo»', importe: 174.5 }],
  total: 174.5, base: 144.21, cuota: 30.29, iva: 21, pedido: '#F3A4B5', metodo: 'Bizum'
}, logo);
await Deno.writeFile(`${salida}/factura.pdf`, Uint8Array.from(atob(pdf), ch => ch.charCodeAt(0)));
console.log('Asuntos:', c.asunto, '|', p.asunto);
