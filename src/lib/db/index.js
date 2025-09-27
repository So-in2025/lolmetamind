import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

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
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Requerido para conexiones a Render
      }
    });
  }
  return pool;
}

/**
 * Busca un usuario por su Google ID. Si no existe, lo crea.
 * @param {object} profile - El perfil del usuario que viene de Google.
 * @returns {object} El usuario de la base de datos.
 */
export async function findOrCreateUser(profile) {
  const db = getPool();
  try {
    // Busca si ya existe un usuario con ese googleId
    let userResult = await db.query('SELECT * FROM users WHERE "googleId" = $1 LIMIT 1', [profile.googleId]);

    if (userResult.rows.length > 0) {
      console.log('Usuario encontrado:', userResult.rows[0].email);
      return userResult.rows[0];
    }

    // Si no existe, creamos uno nuevo
    console.log('Creando nuevo usuario para:', profile.email);
    const newUser = {
      id: uuidv4(),
      googleId: profile.googleId,
      email: profile.email,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      createdAt: new Date().toISOString(),
      has_completed_onboarding: false,
    };

    await db.query(
      'INSERT INTO users (id, "googleId", email, "displayName", "avatarUrl", "createdAt", has_completed_onboarding) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [newUser.id, newUser.googleId, newUser.email, newUser.displayName, newUser.avatarUrl, newUser.createdAt, newUser.has_completed_onboarding]
    );

    return newUser;

  } catch (error) {
    console.error('Error en findOrCreateUser:', error);
    throw new Error('No se pudo buscar o crear el usuario en la base de datos PostgreSQL.');
  }
}

// Exportamos la función para obtener la conexión
export { getPool };