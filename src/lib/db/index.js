// src/lib/db/index.js

import nano from 'nano';
import { v4 as uuidv4 } from 'uuid';

// --- SOLUCIÓN CRÍTICA: Verificación de la variable de entorno ---
if (!process.env.COUCHDB_URL) {
  throw new Error('FATAL ERROR: La variable de entorno COUCHDB_URL no está definida. Revisa tu configuración en Render.');
}

// La conexión a la base de datos ahora es segura
const couch = nano(process.env.COUCHDB_URL);
const usersDb = couch.use('users');
const matchesDb = couch.use('matches');

// ... (El resto de tus funciones, como findOrCreateUser, se mantienen igual) ...

export async function findOrCreateUser(profile) {
  try {
    const query = {
      selector: { googleId: profile.googleId },
      limit: 1,
    };
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

export { usersDb, matchesDb, couch };