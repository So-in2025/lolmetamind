// src/lib/db/index.js

import nano from 'nano';
import { v4 as uuidv4 } from 'uuid';

// Tu conexión a la base de datos se mantiene
const couch = nano(process.env.COUCHDB_URL);
const usersDb = couch.use('users');
const matchesDb = couch.use('matches');

// ... (El resto de tus funciones de la base de datos se mantiene igual)

/**
 * --- FUNCIÓN NUEVA Y CRÍTICA ---
 * Busca un usuario por su Google ID. Si no existe, lo crea.
 * Esto es esencial para el flujo de login.
 * @param {object} profile - El perfil del usuario que viene de Google.
 * @returns {object} El documento del usuario de la base de datos.
 */
export async function findOrCreateUser(profile) {
  try {
    // Buscamos si ya existe un usuario con ese googleId
    const query = {
      selector: { googleId: profile.googleId },
      limit: 1,
    };
    const existingUsers = await usersDb.find(query);

    if (existingUsers.docs.length > 0) {
      console.log('Usuario encontrado:', existingUsers.docs[0].email);
      return existingUsers.docs[0];
    }

    // Si no existe, creamos uno nuevo
    console.log('Creando nuevo usuario para:', profile.email);
    const newUser = {
      _id: uuidv4(), // Generamos un ID único
      googleId: profile.googleId,
      email: profile.email,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      createdAt: new Date().toISOString(),
      has_completed_onboarding: false, // Por defecto, el onboarding no está completado
      // Puedes añadir otros campos por defecto aquí
    };

    await usersDb.insert(newUser);
    return newUser;

  } catch (error) {
    console.error('Error en findOrCreateUser:', error);
    throw new Error('No se pudo buscar o crear el usuario en la base de datos.');
  }
}

// El resto de tus exportaciones originales
export { usersDb, matchesDb, couch };