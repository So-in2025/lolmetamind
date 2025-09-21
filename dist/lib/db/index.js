"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _pg = require("pg");
// src/lib/db/index.js

let pool;

// Esta configuración es la correcta para Vercel al conectar a una DB externa
// que requiere conexiones seguras.
if (!global._pool) {
  global._pool = new _pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
}
pool = global._pool;
var _default = exports.default = pool;