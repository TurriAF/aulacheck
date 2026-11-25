# AulaCheck

Gestor de instalaciones e incidencias para centros educativos. Nace de mi experiencia instalando y configurando pantallas interactivas en colegios e institutos, donde cada centro acumula pequeñas incidencias que conviene tener registradas y priorizadas.

> Los centros e incidencias que trae la base de datos son **datos ficticios de demostración**.

## Qué hace

- Registra incidencias por centro, con prioridad (alta, media, baja) y estado (abierta, en curso, resuelta).
- Filtra por estado, prioridad y centro, y ordena por prioridad.
- Muestra un resumen con el número de incidencias en cada estado.
- Permite cambiar el estado desde la propia tabla.

## Tecnologías

Node.js, Express, SQLite (`better-sqlite3`), HTML, CSS y JavaScript sin frameworks en el cliente.

## Cómo ejecutarlo

Necesitas Node.js 18 o superior.

```bash
npm install
npm start      # http://localhost:3000
npm test       # pruebas de la API
```

## API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/centros` | Lista los centros |
| POST | `/api/centros` | Crea un centro (`nombre`, `localidad`) |
| GET | `/api/incidencias` | Lista incidencias (filtros `estado`, `prioridad`, `centro`) |
| POST | `/api/incidencias` | Crea una incidencia |
| PATCH | `/api/incidencias/:id` | Cambia el estado |
| GET | `/api/resumen` | Cuenta incidencias por estado |

## Decisiones de diseño

- Consultas SQL **parametrizadas** en todos los accesos a la base de datos.
- Validación de entrada en el servidor y restricciones `CHECK` en el esquema.
- La interfaz construye el DOM con `textContent`, no con `innerHTML`, para no interpretar el texto escrito por el usuario como HTML.
- Pruebas automáticas con el módulo `node:test`.

## Próximos pasos

- [ ] Usuarios con roles (técnico y administrador)
- [ ] Historial de cambios y comentarios por incidencia
- [ ] Inventario de equipos por centro
- [ ] Versión con MySQL
- [ ] Despliegue en un servidor propio con Docker
