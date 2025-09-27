import nano from 'nano';
import { v4 as uuidv4 } from 'uuid';

let couch;
let usersDb;
let matchesDb;

/**
 * --- SOLUCIÓN CRÍTICA: Inicialización "Lazy" ---
 * Esta función asegura que la conexión a la base de datos solo se establezca
 * cuando una ruta de la API la necesite, y no durante el build.
 */
function getDb() {
  if (!couch) {
    if (!process.env.COUCHDB_URL) {
      throw new Error('FATAL ERROR: La variable de entorno COUCHDB_URL no está definida.');
    }
    couch = nano(process.env.COUCHDB_URL);
    usersDb = couch.use('users');
    matchesDb = couch.use('matches');
  }
  return { couch, usersDb, matchesDb };
}

export async function findOrCreateUser(profile) {
  const { usersDb } = getDb(); // Obtenemos la conexión
  try {
    const query = { selector: { googleId: profile.googleId }, limit: 1 };
    const existingUsers = await usersDb.find(query);

    if (existingUsers.docs.length > 0) {
      return existingUsers.docs[0];
    }

    const newUser = {
      _id: uuidv4(),
      googleId: profile.googleId,
      email: profile.email,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      createdAt: new Date().toISOString(),
      has_completed_onboarding: false,
    };
    await usersDb.insert(newUser);
    return newUser;
  } catch (error) {
    console.error('Error en findOrCreateUser:', error);
    throw new Error('No se pudo buscar o crear el usuario.');
  }
}

// Exportamos la función para obtener la DB, no las instancias directamente
export { getDb };
