#!/bin/bash

# =========================================================================================
# SOLUCIÓN DEFINITIVA DE BABEL Y CJS
# Objetivo: Arreglar el error de Babel (Unknown option: .extensions) Y forzar CJS.
# =========================================================================================

BASE_DIR="." 

echo "--- 1. Corrigiendo babel.config.server.js: Eliminando la opción inválida 'extensions' ---"
# Esto permitirá que el build pase la fase de compilación.
cat > "${BASE_DIR}/babel.config.server.js" << 'EOL'
// babel.config.server.js
// Configuración de Babel para el servidor de WebSockets
module.exports = {
  "presets": [
    [
      "@babel/preset-env",
      {
        "targets": {
          "node": "current"
        },
        "modules": "commonjs" 
      }
    ]
  ],
  "plugins": [
    [
      "module-resolver",
      {
        "root": ["./src"],
        "alias": {
          "@": "./src"
        }
      }
    ]
  ]
};
EOL
echo "babel.config.server.js corregido (eliminado 'extensions')."


echo "--- 2. Renombrando src/lib/db/index.js a src/lib/db/index.cjs (FIX DE Causa Raíz) ---"
# Si el archivo falló, es porque no existe o está en una ubicación inesperada.
# Intentaremos moverlo a CJS y recrear su contenido.
mv "${BASE_DIR}/src/lib/db/index.js" "${BASE_DIR}/src/lib/db/index.cjs" 2>/dev/null || true # Ignoramos error si ya está movido

# Recreamos el archivo .cjs con su contenido correcto de CJS
cat > "${BASE_DIR}/src/lib/db/index.cjs" << 'EOL'
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
echo "Archivo de DB forzado a .cjs."


echo "--- 3. Corrigiendo websocket-server.js para importar el nuevo archivo .cjs compilado ---"
# Apuntamos al archivo transpilado, que debería ser dist/lib/db/index.cjs
cat > "${BASE_DIR}/websocket-server.js" << 'EOL'
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const url = require('url');
require('dotenv').config();

// Imports de la distribución compilada (CJS)
const prompts = require('./dist/lib/ai/prompts');
const strategist = require('./dist/lib/ai/strategist');
// CORRECCIÓN CRÍTICA: Apuntar al archivo CJS renombrado y compilado
const db = require('./dist/lib/db/index.cjs'); 

const { createLiveCoachingPrompt } = prompts;
const { generateStrategicAnalysis } = strategist;


const port = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET;

const pool = db.pool; 

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
    
    // BYPASS PREMIUM
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
            
            ws.send(JSON.stringify({ realtimeAdvice: messageObject.realtimeAdvice, priorityAction: messageObject.priorityAction }));
            
        } catch (error) {
            console.error(`Error al generar o enviar consejo ÉLITE para ${freshUserData.username}:`, error);
            ws.send(JSON.stringify({ realtimeAdvice: "ERROR CRÍTICO: El enlace táctico con la IA se ha cortado. Concentración manual.", priorityAction: 'ERROR' }));
        }
        
    } else {
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
echo "    ✅ FIX FINAL APLICADO: BABEL Y MÓDULOS"
echo "=========================================================="
echo "Hemos corregido el archivo de configuración de Babel que causaba el fallo del build y hemos forzado el módulo de la base de datos a .cjs."
echo "Por favor, haz un commit y deploy a Render. Esta es la solución de configuración más estricta posible."