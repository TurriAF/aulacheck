const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const PRIORIDADES = ['baja', 'media', 'alta'];
const ESTADOS = ['abierta', 'en_curso', 'resuelta'];
const texto = (v) => (typeof v === 'string' ? v.trim() : '');

function sembrar(db) {
  const centro = db.prepare('INSERT INTO centros (nombre, localidad) VALUES (?, ?)');
  centro.run('IES Mediterráneo (demo)', 'Almería');
  centro.run('CEIP Los Almendros (demo)', 'Roquetas de Mar');
  centro.run('CEIP La Vega (demo)', 'El Ejido');
  const inc = db.prepare('INSERT INTO incidencias (centro_id, titulo, descripcion, prioridad, estado) VALUES (?, ?, ?, ?, ?)');
  inc.run(1, 'Pantalla del aula 3 sin señal HDMI', 'Tras la instalación no detecta el portátil del profesor.', 'alta', 'abierta');
  inc.run(1, 'Configurar wifi de la pantalla del aula 5', 'Falta integrarla en la red del centro.', 'media', 'en_curso');
  inc.run(2, 'Soporte de pared flojo en el aula 1', 'Revisar anclajes antes de dejar la pantalla en uso.', 'alta', 'en_curso');
  inc.run(2, 'Actualizar firmware de pantallas', 'Aplicar la última versión en las 4 aulas.', 'baja', 'abierta');
  inc.run(3, 'Cable de red sin etiquetar en el rack', 'Etiquetar y documentar los puntos de red.', 'baja', 'resuelta');
  inc.run(3, 'Pantalla del aula 2 no enciende', 'Comprobar alimentación y regleta.', 'media', 'resuelta');
}

function crearApp(dbFile = path.join(__dirname, 'aulacheck.db')) {
  const db = new Database(dbFile);
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS centros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      localidad TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS incidencias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      centro_id INTEGER NOT NULL REFERENCES centros(id),
      titulo TEXT NOT NULL,
      descripcion TEXT NOT NULL DEFAULT '',
      prioridad TEXT NOT NULL CHECK (prioridad IN ('baja','media','alta')),
      estado TEXT NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta','en_curso','resuelta')),
      creada_en TEXT NOT NULL DEFAULT (datetime('now')),
      actualizada_en TEXT NOT NULL DEFAULT (datetime('now'))
    );`);
  if (db.prepare('SELECT COUNT(*) AS n FROM centros').get().n === 0) sembrar(db);

  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/api/centros', (req, res) => {
    res.json(db.prepare('SELECT id, nombre, localidad FROM centros ORDER BY nombre').all());
  });

  app.post('/api/centros', (req, res) => {
    const nombre = texto(req.body.nombre);
    const localidad = texto(req.body.localidad);
    if (!nombre || !localidad) return res.status(400).json({ error: 'nombre y localidad son obligatorios' });
    try {
      const r = db.prepare('INSERT INTO centros (nombre, localidad) VALUES (?, ?)').run(nombre, localidad);
      res.status(201).json({ id: r.lastInsertRowid, nombre, localidad });
    } catch (e) {
      if (String(e.code).startsWith('SQLITE_CONSTRAINT')) return res.status(409).json({ error: 'ese centro ya existe' });
      throw e;
    }
  });

  app.get('/api/incidencias', (req, res) => {
    const filtros = [];
    const valores = [];
    if (req.query.estado) { filtros.push('i.estado = ?'); valores.push(req.query.estado); }
    if (req.query.prioridad) { filtros.push('i.prioridad = ?'); valores.push(req.query.prioridad); }
    if (req.query.centro) { filtros.push('i.centro_id = ?'); valores.push(Number(req.query.centro)); }
    const where = filtros.length ? 'WHERE ' + filtros.join(' AND ') : '';
    const filas = db.prepare(`
      SELECT i.id, i.titulo, i.descripcion, i.prioridad, i.estado, i.creada_en, c.nombre AS centro
      FROM incidencias i JOIN centros c ON c.id = i.centro_id
      ${where}
      ORDER BY CASE i.prioridad WHEN 'alta' THEN 0 WHEN 'media' THEN 1 ELSE 2 END, i.id DESC`).all(...valores);
    res.json(filas);
  });

  app.post('/api/incidencias', (req, res) => {
    const titulo = texto(req.body.titulo);
    const descripcion = texto(req.body.descripcion);
    const { prioridad } = req.body;
    const centroId = Number(req.body.centro_id);
    if (!titulo) return res.status(400).json({ error: 'el título es obligatorio' });
    if (!PRIORIDADES.includes(prioridad)) return res.status(400).json({ error: 'prioridad no válida' });
    if (!db.prepare('SELECT 1 FROM centros WHERE id = ?').get(centroId)) return res.status(400).json({ error: 'centro no válido' });
    const r = db.prepare('INSERT INTO incidencias (centro_id, titulo, descripcion, prioridad) VALUES (?, ?, ?, ?)')
      .run(centroId, titulo, descripcion, prioridad);
    res.status(201).json({ id: r.lastInsertRowid });
  });

  app.patch('/api/incidencias/:id', (req, res) => {
    const { estado } = req.body;
    if (!ESTADOS.includes(estado)) return res.status(400).json({ error: 'estado no válido' });
    const r = db.prepare("UPDATE incidencias SET estado = ?, actualizada_en = datetime('now') WHERE id = ?")
      .run(estado, Number(req.params.id));
    if (r.changes === 0) return res.status(404).json({ error: 'incidencia no encontrada' });
    res.json({ id: Number(req.params.id), estado });
  });

  app.get('/api/resumen', (req, res) => {
    const resumen = { abierta: 0, en_curso: 0, resuelta: 0 };
    db.prepare('SELECT estado, COUNT(*) AS n FROM incidencias GROUP BY estado').all().forEach((f) => { resumen[f.estado] = f.n; });
    res.json(resumen);
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'error interno' });
  });

  return { app, db };
}

if (require.main === module) {
  const puerto = process.env.PORT || 3000;
  crearApp().app.listen(puerto, () => console.log(`AulaCheck en http://localhost:${puerto}`));
}

module.exports = { crearApp };
