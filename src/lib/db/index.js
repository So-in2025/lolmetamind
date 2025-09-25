const { Pool } = require('pg');

let pool;

// Usamos un singleton global para mantener una sola Pool de conexiones.
if (!global._pool) {
  // Configuración para permitir conexiones seguras necesarias en Vercel/Render
  global._pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
}
pool = global._pool;

// Exportamos un objeto con el método query (para compatibilidad) y la pool raw.
const db = {
  query: (text, params) => pool.query(text, params),
  pool: pool, // Exponemos el pool para usar .connect() en transacciones
};

export default db; // Exportamos el objeto 'db' por defecto
