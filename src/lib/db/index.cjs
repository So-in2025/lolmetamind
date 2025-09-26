const { Pool } = require('pg');

let pool;

if (!global._pool) {
  global._pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
}
pool = global._pool;

const db = {
  query: (text, params) => pool.query(text, params),
  pool: pool,
};

export default db;
