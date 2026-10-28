/* ==========================================================
   ZIP sin compresión (compatible con todo, sin librerías)
   Lo usa la librería (/library).
   ========================================================== */
const TABLA = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = TABLA[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
export function crearZip(archivos) {
  const enc = new TextEncoder(), partes = [], central = [];
  let pos = 0;
  const d = new Date(), hora = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), dia = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const f of archivos) {
    const nombre = enc.encode(f.nombre), datos = typeof f.datos === 'string' ? enc.encode(f.datos) : new Uint8Array(f.datos);
    const crc = crc32(datos);
    const loc = new DataView(new ArrayBuffer(30));
    [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, hora, 2], [12, dia, 2], [14, crc, 4], [18, datos.length, 4], [22, datos.length, 4], [26, nombre.length, 2], [28, 0, 2]]
      .forEach(([o, v, n]) => (n === 4 ? loc.setUint32(o, v, true) : loc.setUint16(o, v, true)));
    partes.push(loc.buffer, nombre, datos);
    const cen = new DataView(new ArrayBuffer(46));
    [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, hora, 2], [14, dia, 2], [16, crc, 4], [20, datos.length, 4], [24, datos.length, 4], [28, nombre.length, 2], [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, pos, 4]]
      .forEach(([o, v, n]) => (n === 4 ? cen.setUint32(o, v, true) : cen.setUint16(o, v, true)));
    central.push(cen.buffer, nombre);
    pos += 30 + nombre.length + datos.length;
  }
  const tamCentral = central.reduce((s, b) => s + (b.byteLength ?? b.length), 0);
  const fin = new DataView(new ArrayBuffer(22));
  [[0, 0x06054b50, 4], [4, 0, 2], [6, 0, 2], [8, archivos.length, 2], [10, archivos.length, 2], [12, tamCentral, 4], [16, pos, 4], [20, 0, 2]]
    .forEach(([o, v, n]) => (n === 4 ? fin.setUint32(o, v, true) : fin.setUint16(o, v, true)));
  return new Blob([...partes, ...central, fin.buffer], { type: 'application/zip' });
}
