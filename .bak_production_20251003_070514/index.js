import postgres from 'postgres'; 

let sql;

/**
 * --- SOLUCIÓN CRÍTICA: CAMBIO DE DRIVER DE 'pg' A 'postgres' ---
 * Usamos el driver 'postgres' (JS puro) para evitar el bug de serialización.
 * El objeto devuelto 'sql' es una función que ejecuta consultas.
 */
function getSql() {
  if (!sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('FATAL ERROR: La variable de entorno DATABASE_URL no está definida.');
    }
    
    // 🚨 Configuración para Render (SSL) y el driver 'postgres'
    sql = postgres(process.env.DATABASE_URL, {
      ssl: {
        rejectUnauthorized: false 
      },
      // Configuración de pools y timeouts si es necesario, pero la configuración base es suficiente.
      max: 10, // Máximo de conexiones
    });
    
    console.log("[DB] Driver 'postgres' inicializado y conectado.");
  }
  return sql;
}

// Exportamos la función con un nombre más descriptivo para el nuevo driver
export { getSql };