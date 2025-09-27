import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { findOrCreateUser } from '../db'; // Asumimos que esta función existe en tu DB handler

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback", // La ruta relativa en tu backend
    scope: ['profile', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Usamos la información de Google para encontrar o crear un usuario en tu base de datos
      const user = await findOrCreateUser({
        googleId: profile.id,
        email: profile.emails[0].value,
        displayName: profile.displayName,
        avatarUrl: profile.photos[0].value
      });
      // Devolvemos el usuario para que la ruta de callback lo pueda usar
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
));

// Estas funciones son necesarias para que Passport maneje la sesión
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    // Aquí buscarías al usuario en tu DB por su ID
    // const user = await findUserById(id);
    // done(null, user);
    done(null, { id }); // Placeholder hasta que implementes findUserById
});

export default passport;