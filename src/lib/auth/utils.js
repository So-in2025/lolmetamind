// src/lib/auth/utils.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Genera un hash de una contraseña.
 */
export const hashPassword = (password) => {
  return bcrypt.hash(password, 10);
};

/**
 * Compara una contraseña con su hash.
 */
export const comparePassword = (password, hash) => {
  return bcrypt.compare(password, hash);
};

/**
 * Crea un token JWT para un usuario.
 */
export const createToken = (user) => {
  if (!JWT_SECRET) {
    throw new Error('La clave secreta JWT no está definida en las variables de entorno.');
  }
  return jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: '7d', // El token expira en 7 días
  });
};
