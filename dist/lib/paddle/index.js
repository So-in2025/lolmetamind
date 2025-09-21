"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.paddle = void 0;
var _paddleNodeSdk = require("@paddle/paddle-node-sdk");
// Inicializa el SDK de Paddle con tu clave de API
// El SDK leerá la variable de entorno PADDLE_API_KEY automáticamente.
const paddle = exports.paddle = new _paddleNodeSdk.Paddle();