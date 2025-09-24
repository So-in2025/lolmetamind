const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Ahora exportamos el objeto 'db' por defecto
const db = {
  query: (text, params) => pool.query(text, params),
};

export default db; // <-- ¡ESTO ES LO CLAVE!
