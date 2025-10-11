// src/services/apiConfig.js
// Configuración central para las claves de API y endpoints.
// Carga las variables de entorno para no exponerlas en el código.
import 'dotenv/config';

export const RIOT_API_KEY = process.env.RIOT_API_KEY;
export const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // nueva
export const GEMINI_API_KEY_2 = process.env.GEMINI_API_KEY_2;
export const OPENAI_API_KEY_2 = process.env.OPENAI_API_KEY_2; // nueva

// Endpoints base (ejemplo para la región LAS)
export const RIOT_API_BASE_URL = 'https://las.api.riotgames.com';
export const TWITCH_AUTH_BASE_URL = 'https://id.twitch.tv/oauth2';
export const OPENAI_API_BASE_URL = 'https://api.openai.com/v1'; // nueva
