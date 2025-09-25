#!/bin/bash

# =========================================================================================
# SCRIPT DE CORRECCIÓN FINAL (MODO CJS FORZADO)
# Objetivo: Forzar la resolución de src/lib/db/index.js a CommonJS usando la extensión .cjs.
# =========================================================================================

REPO_PATH="so-in2025/lolmetamind/lolmetamind-4c93b36005431c7bc42c809ecd76beefdf126f70"
LIB_PATH="${REPO_PATH}/src/lib"

echo "--- 1. Renombrando src/lib/db/index.js a src/lib/db/index.cjs ---"
mv "${LIB_PATH}/db/index.js" "${LIB_PATH}/db/index.cjs"
echo "Archivo renombrado. Node.js ahora lo ejecutará como CommonJS."


echo "--- 2. Actualizando babel.config.server.js para incluir el nuevo archivo .cjs ---"
# El archivo original solo incluía 'js', ahora agregamos 'cjs'.
cat > "${REPO_PATH}/babel.config.server.js" << 'EOL'
// babel.config.server.js
// Configuración de Babel para el servidor de WebSockets (Render)
module.exports = {
  "presets": [
    [
      "@babel/preset-env",
      {
        "targets": {
          "node": "current"
        }
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
  // CRÍTICO: Aseguramos que Babel también transpile archivos .cjs
  "extensions": [".js", ".jsx", ".cjs"] 
};
EOL
echo "babel.config.server.js actualizado para manejar .cjs."


echo "--- 3. Corrigiendo websocket-server.js para importar el nuevo archivo .cjs compilado ---"
# Se mantiene la lógica del Coach de Élite y el bypass de Premium.

cat > "${REPO_PATH}/websocket-server.js" << 'EOL'
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const url = require('url');
require('dotenv').config();

// Imports de la distribución compilada (CRÍTICO: apunto al nuevo archivo .cjs compilado)
const prompts = require('./dist/lib/ai/prompts');
const strategist = require('./dist/lib/ai/strategist');
const db = require('./dist/lib/db/index.cjs'); // <--- CORRECCIÓN A .cjs

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
        // Mensaje de estado (mantenido)
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
echo "    ✅ SOLUCIÓN DEFINITIVA A 'require is not defined'"
echo "=========================================================="
echo "Hemos forzado el archivo problemático al modo CJS (.cjs)."
echo ""
echo "Acciones requeridas:"
echo "1. **Ejecuta este nuevo script de Bash en tu proyecto web local.**"
echo "2. **Haz un nuevo commit y deploy a Render.** (Esto debería resolver el problema al forzar el modo de módulo correcto)."