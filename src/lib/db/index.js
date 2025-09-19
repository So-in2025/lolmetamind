// src/lib/db/index.js
import { Pool } from 'pg';

let pool;

// Esta configuración es la correcta para Vercel al conectar a una DB externa
// que requiere conexiones seguras.
if (!global._pool) {
  global._pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
}
pool = global._pool;

export default pool;
