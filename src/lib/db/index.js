// src/lib/db/index.js
import { Pool } from 'pg';

let pool;

// Esta configuración es la recomendada para Vercel.
// Vercel maneja el SSL automáticamente a través de la connection string.
if (!global._pool) {
  global._pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
}
pool = global._pool;

export default pool;
