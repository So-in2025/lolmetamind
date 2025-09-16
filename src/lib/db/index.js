// src/lib/db/index.js
import { Pool } from 'pg';

let pool;

// Esta configuración es más simple y es la recomendada para Vercel.
if (!pool) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
}

export default pool;
