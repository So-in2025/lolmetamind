"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TWITCH_CLIENT_ID = exports.TWITCH_AUTH_BASE_URL = exports.RIOT_API_KEY = exports.RIOT_API_BASE_URL = exports.OPENAI_API_KEY = exports.OPENAI_API_BASE_URL = exports.GEMINI_API_KEY = void 0;
require("dotenv/config");
// src/services/apiConfig.js
// Configuración central para las claves de API y endpoints.
// Carga las variables de entorno para no exponerlas en el código.

const RIOT_API_KEY = exports.RIOT_API_KEY = process.env.RIOT_API_KEY;
const TWITCH_CLIENT_ID = exports.TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const GEMINI_API_KEY = exports.GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = exports.OPENAI_API_KEY = process.env.OPENAI_API_KEY; // nueva

// Endpoints base (ejemplo para la región LAS)
const RIOT_API_BASE_URL = exports.RIOT_API_BASE_URL = 'https://las.api.riotgames.com';
const TWITCH_AUTH_BASE_URL = exports.TWITCH_AUTH_BASE_URL = 'https://id.twitch.tv/oauth2';
const OPENAI_API_BASE_URL = exports.OPENAI_API_BASE_URL = 'https://api.openai.com/v1'; // nueva