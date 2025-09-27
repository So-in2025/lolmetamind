// src/lib/auth/utils.js

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import { findOrCreateUser } from '../db';

/**
 * --- FUNCIÓN NUEVA ---
 * Crea un JSON Web Token (JWT) para la sesión del usuario.
 * @param {object} user - El objeto del usuario de la base de datos.
 * @returns {string} El token de sesión firmado.
 */
export function createToken(user) {
  const payload = {
    id: user._id, // Usamos el _id de CouchDB
    email: user.email,
  };

  // Firmamos el token con tu secreto y le damos una duración de 7 días
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

  return token;
}

// Estrategia de Passport para Google
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback",
    scope: ['profile', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const userProfile = {
        googleId: profile.id,
        email: profile.emails[0].value,
        displayName: profile.displayName,
        avatarUrl: profile.photos[0].value
      };
      const user = await findOrCreateUser(userProfile);
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
));

export default passport;