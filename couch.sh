#!/bin/bash

# =========================================================================================
# SOLUCIÓN DE RAÍZ: MODO CJS FORZADO (USANDO RUTAS RELATIVAS DEL PROYECTO)
# Objetivo: Resolver el 'require is not defined' forzando la extensión .cjs.
# =========================================================================================

# Ajustamos la ruta base a la estructura de archivos visible en la foto.
BASE_DIR="." 

echo "--- 1. Renombrando src/lib/db/index.js a src/lib/db/index.cjs (CAUSA RAÍZ) ---"
# Esto es para que Node.js v22 deje de interpretarlo como ESM.
mv "${BASE_DIR}/src/lib/db/index.js" "${BASE_DIR}/src/lib/db/index.cjs"
echo "Archivo de DB renombrado a src/lib/db/index.cjs."


echo "--- 2. Actualizando babel.config.server.js para procesar archivos .cjs ---"
# Es fundamental que Babel sepa que debe transpilar la nueva extensión.
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
  ],
  // CRÍTICO: Permitir que Babel procese archivos .cjs
  "extensions": [".js", ".jsx", ".cjs"] 
};
EOL
echo "babel.config.server.js actualizado."


echo "--- 3. Corrigiendo websocket-server.js para importar el nuevo archivo .cjs compilado ---"
# El archivo de entrada debe apuntar explícitamente al archivo transpilado correcto.
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
echo "    ✅ SOLUCIÓN DE RAÍZ APLICADA (RUTA ABSOLUTA CORREGIDA)"
echo "=========================================================="
echo "El problema de ruta se resolvió. Por favor, ejecuta este script desde la **carpeta raíz de tu repositorio** y haz un nuevo deploy."