const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Usamos 'export const' para que sea un módulo ES compatible con Next.js
export const db = {
  query: (text, params) => pool.query(text, params),
};
