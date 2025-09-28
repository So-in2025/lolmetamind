"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getPool = getPool;
var _pg = require("pg");
let pool;

/**
 * --- SOLUCIÓN CRÍTICA: Conexión a PostgreSQL en Render ---
 * Esta función establece la conexión a tu base de datos PostgreSQL.
 * Utiliza la variable de entorno DATABASE_URL que Render te da automáticamente.
 */
function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('FATAL ERROR: La variable de entorno DATABASE_URL no está definida. Asegúrate de que tu servicio web esté conectado a tu base de datos en el dashboard de Render.');
    }
    pool = new _pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Requerido para conexiones a Render
      }
    });
  }
  return pool;
}

// Exportamos la función para obtener la conexión