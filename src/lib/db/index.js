import postgres from 'postgres'; 

let sql;

/**
 * Inicializa y devuelve la función de conexión a PostgreSQL.
 * Implementa pool de conexiones escalable para alta concurrencia.
 */
function getSql() {
  if (!sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('FATAL ERROR: La variable de entorno DATABASE_URL no está definida.');
    }
    
    // 🚨 OPTIMIZACIÓN DE ESCALABILIDAD: Usa una variable de entorno o 50 como mínimo.
    const MAX_POOL_SIZE = parseInt(process.env.DB_MAX_POOL, 10) || 50; 
    
    sql = postgres(process.env.DATABASE_URL, {
      ssl: {
        rejectUnauthorized: false 
      },
      max: MAX_POOL_SIZE, // Mínimo 50 para alto tráfico concurrente
    });
    
    console.log(`[DB] Driver 'postgres' inicializado y conectado. Pool Size: ${MAX_POOL_SIZE}`);
  }
  return sql;
}

export { getSql };
