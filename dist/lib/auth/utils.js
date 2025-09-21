"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.hashPassword = exports.createToken = exports.comparePassword = void 0;
var _bcryptjs = _interopRequireDefault(require("bcryptjs"));
var _jsonwebtoken = _interopRequireDefault(require("jsonwebtoken"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// src/lib/auth/utils.js

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Genera un hash de una contraseña.
 */
const hashPassword = password => {
  return _bcryptjs.default.hash(password, 10);
};

/**
 * Compara una contraseña con su hash.
 */
exports.hashPassword = hashPassword;
const comparePassword = (password, hash) => {
  return _bcryptjs.default.compare(password, hash);
};

/**
 * Crea un token JWT para un usuario.
 */
exports.comparePassword = comparePassword;
const createToken = user => {
  if (!JWT_SECRET) {
    throw new Error('La clave secreta JWT no está definida en las variables de entorno.');
  }
  return _jsonwebtoken.default.sign({
    userId: user.id,
    username: user.username
  }, JWT_SECRET, {
    expiresIn: '7d' // El token expira en 7 días
  });
};
exports.createToken = createToken;