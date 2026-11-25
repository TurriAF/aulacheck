const test = require('node:test');
const assert = require('node:assert');
const { crearApp } = require('../server');

async function arrancar() {
  const { app, db } = crearApp(':memory:');
  const servidor = await new Promise((ok) => { const s = app.listen(0, () => ok(s)); });
  const base = `http://localhost:${servidor.address().port}`;
  const pedir = async (ruta, opciones = {}) => {
    const r = await fetch(base + ruta, { headers: { 'Content-Type': 'application/json' }, ...opciones });
    return { status: r.status, datos: await r.json() };
  };
  return { pedir, cerrar: () => { servidor.close(); db.close(); } };
}

test('lista los datos de demostración', async () => {
  const { pedir, cerrar } = await arrancar();
  const { status, datos } = await pedir('/api/incidencias');
  assert.strictEqual(status, 200);
  assert.strictEqual(datos.length, 6);
  assert.strictEqual(datos[0].prioridad, 'alta');
  cerrar();
});

test('crea una incidencia y la encuentra filtrando', async () => {
  const { pedir, cerrar } = await arrancar();
  const nueva = await pedir('/api/incidencias', { method: 'POST', body: JSON.stringify({ centro_id: 1, titulo: 'Prueba', prioridad: 'media' }) });
  assert.strictEqual(nueva.status, 201);
  const lista = await pedir('/api/incidencias?estado=abierta&centro=1');
  assert.ok(lista.datos.some((i) => i.titulo === 'Prueba'));
  cerrar();
});

test('rechaza datos no válidos', async () => {
  const { pedir, cerrar } = await arrancar();
  const mala = await pedir('/api/incidencias', { method: 'POST', body: JSON.stringify({ centro_id: 1, titulo: 'x', prioridad: 'urgente' }) });
  assert.strictEqual(mala.status, 400);
  const sinCentro = await pedir('/api/incidencias', { method: 'POST', body: JSON.stringify({ centro_id: 99, titulo: 'x', prioridad: 'baja' }) });
  assert.strictEqual(sinCentro.status, 400);
  cerrar();
});

test('cambia el estado y devuelve 404 si no existe', async () => {
  const { pedir, cerrar } = await arrancar();
  const ok = await pedir('/api/incidencias/1', { method: 'PATCH', body: JSON.stringify({ estado: 'resuelta' }) });
  assert.strictEqual(ok.status, 200);
  const resumen = await pedir('/api/resumen');
  assert.strictEqual(resumen.datos.resuelta, 3);
  const noExiste = await pedir('/api/incidencias/999', { method: 'PATCH', body: JSON.stringify({ estado: 'abierta' }) });
  assert.strictEqual(noExiste.status, 404);
  cerrar();
});

test('no permite centros duplicados', async () => {
  const { pedir, cerrar } = await arrancar();
  const r = await pedir('/api/centros', { method: 'POST', body: JSON.stringify({ nombre: 'CEIP La Vega (demo)', localidad: 'El Ejido' }) });
  assert.strictEqual(r.status, 409);
  cerrar();
});
