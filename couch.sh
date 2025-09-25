#!/bin/bash

# =========================================================================================
# SCRIPT DEFINITIVO DE CORRECCIÓN CJS/ESM (SOLUCIONA 'require is not defined')
# Objetivo: Eliminar la ambigüedad de módulos para que el servidor WebSocket se inicie.
# =========================================================================================

REPO_PATH="so-in2025/lolmetamind/lolmetamind-4c93b36005431c7bc42c809ecd76beefdf126f70"
LIB_PATH="${REPO_PATH}/src/lib"
SERVICES_PATH="${REPO_PATH}/src/services"

echo "--- 1. Aplicando la corrección estricta de CommonJS a los módulos de librería ---"

# --- src/lib/db/index.js (CJS estricto) ---
cat > "${LIB_PATH}/db/index.js" << 'EOL'
const { Pool } = require('pg');

let pool;

if (!global._pool) {
  global._pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
}
pool = global._pool;

const db = {
  query: (text, params) => pool.query(text, params),
  pool: pool,
};

module.exports = db;
EOL

# --- src/lib/auth/utils.js (CJS estricto) ---
cat > "${LIB_PATH}/auth/utils.js" << 'EOL'
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

exports.hashPassword = (password) => {
  return bcrypt.hash(password, 10);
};

exports.comparePassword = (password, hash) => {
  return bcrypt.compare(password, hash);
};

exports.createToken = (user) => {
  if (!JWT_SECRET) {
    throw new Error('La clave secreta JWT no está definida en las variables de entorno.');
  }
  return jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: '7d',
  });
};

exports.verifyAuth = async (req) => {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) return { error: 'No autorizado' };
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return { userId: decoded.userId };
    } catch (error) {
        return { error: 'Token inválido' };
    }
};
EOL

# --- src/services/apiConfig.js (CJS estricto) ---
cat > "${SERVICES_PATH}/apiConfig.js" << 'EOL'
// src/services/apiConfig.js
require('dotenv/config');

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const RIOT_API_BASE_URL = 'https://las.api.riotgames.com';
const TWITCH_AUTH_BASE_URL = 'https://id.twitch.tv/oauth2';

module.exports = {
  RIOT_API_KEY,
  TWITCH_CLIENT_ID,
  GEMINI_API_KEY,
  RIOT_API_BASE_URL,
  TWITCH_AUTH_BASE_URL
};
EOL

echo "--- 2. Ajustando websocket-server.js para usar CommonJS seguro y Coach de Élite ---"
cat > "${REPO_PATH}/websocket-server.js" << 'EOL'
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const url = require('url');
require('dotenv').config();

// Imports de la distribución compilada (CommonJS - sin desestructuración directa)
const prompts = require('./dist/lib/ai/prompts');
const strategist = require('./dist/lib/ai/strategist');
const db = require('./dist/lib/db'); 

// Extraemos las funciones para usarlas fácilmente
const { createLiveCoachingPrompt } = prompts;
const { generateStrategicAnalysis } = strategist;


const port = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET;

const pool = db.pool; // Accedemos a la pool desde el objeto 'db' exportado.

const wss = new WebSocket.Server({ port });
const clients = new Map();

console.log(`✅ Servidor WebSocket de Producción iniciado en el puerto ${port}.`);

const fetchUserData = async (userId) => {
  try {
    const res = await pool.query('SELECT id, username, zodiac_sign, live_game_data, subscription_tier FROM users WHERE id = $1', [userId]);
    return res.rows[0];
  } catch (error) {
    console.error(`Error al buscar usuario ${userId} en la DB:`, error);
    return null;
  }
};

wss.on('connection', (ws, req) => {
  const parameters = url.parse(req.url, true).query;
  const token = parameters.token;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    ws.userId = decoded.userId;
    clients.set(ws, { id: decoded.userId });
    console.log(`[CONEXIÓN] Usuario ${decoded.userId} conectado. Clientes activos: ${clients.size}`);
    
    ws.send(JSON.stringify({ realtimeAdvice: 'Conectado al Coach MetaMind. Esperando inicio de partida.', priorityAction: 'STATUS' }));

  } catch (err) {
    console.log('[ERROR] Conexión rechazada: Token JWT inválido.', err.message);
    ws.close(1008, 'Token JWT inválido');
    return;
  }

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[DESCONEXIÓN] Usuario ${ws.userId} desconectado. Clientes activos: ${clients.size}`);
  });
});


// --- EL MOTOR DE COACHING DE ÉLITE EN TIEMPO REAL (BYPASS ACTIVO) ---
setInterval(async () => {
  if (clients.size === 0) return;

  for (const [ws, clientData] of clients.entries()) {
    if (ws.readyState !== WebSocket.OPEN) continue;

    const freshUserData = await fetchUserData(clientData.id); 
    
    // BYPASS PREMIUM: Cualquier usuario con datos de juego recibe el consejo.
    if (freshUserData && freshUserData.live_game_data) {
        
        const liveGameData = freshUserData.live_game_data;
        
        try {
            const analysisResult = await generateStrategicAnalysis({ 
                liveGameData: liveGameData, 
                zodiacSign: freshUserData.zodiac_sign || 'Aries' 
            });
            
            const messageObject = {
                realtimeAdvice: analysisResult.realtimeAdvice || analysisResult.message, 
                priorityAction: analysisResult.priorityAction || 'ANALYSIS',
                gameTime: liveGameData.gameTime 
            };
            
            ws.send(JSON.stringify(messageObject));
            
        } catch (error) {
            console.error(`Error al generar o enviar consejo ÉLITE para ${freshUserData.username}:`, error);
            ws.send(JSON.stringify({ realtimeAdvice: "ERROR CRÍTICO: El enlace táctico con la IA se ha cortado. Concentración manual.", priorityAction: 'ERROR' }));
        }
        
    } else {
        // Mensaje de estado
        const statusMessage = freshUserData && freshUserData.subscription_tier !== 'PREMIUM'
          ? 'Acceso limitado. Coach en tiempo real es Premium.'
          : 'Coach inactivo. Inicia una partida con la App de escritorio.'; 

        ws.send(JSON.stringify({ realtimeAdvice: statusMessage, priorityAction: 'STATUS' }));
    }
  }
}, 10000); 
EOL

echo ""
echo "=========================================================="
echo "    ✅ CORRECCIÓN DEFINITIVA CJS/ESM APLICADA"
echo "=========================================================="
echo "Esta versión del script debería eliminar el error 'require is not defined'."
echo ""
echo "Acciones requeridas:"
echo "1. **Ejecuta este nuevo script de Bash en tu proyecto web local.**"
echo "2. **Haz un nuevo commit y deploy a Render.** (Esto re-ejecutará 'npm run build:server' y usará los archivos CommonJS corregidos)."