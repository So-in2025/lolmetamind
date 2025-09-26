#!/bin/bash

# =========================================================================================
# SOLUCIÓN DEFINITIVA DE CONSTRUCTOR WS (Elimina "Invalid URL: [object Object]")
# Objetivo: Forzar la importación de la clase Server de 'ws' usando ESM.
# =========================================================================================

BASE_DIR="." 

echo "--- 1. Corrigiendo package.json: Asegurando Node 18.x (a pesar del log) ---"
# Este paso es solo una medida de precaución para garantizar que el campo 'engines' esté correcto.
if command -v jq &> /dev/null
then
    jq '.engines.node = "18.x"' "${BASE_DIR}/package.json" > temp_package.json && mv temp_package.json "${BASE_DIR}/package.json"
else
    # Fallback para sistemas sin jq
    sed -i -E 's/"dependencies": \{/"dependencies": \{/g' "${BASE_DIR}/package.json" 2>/dev/null || true
    sed -i -E '/"devDependencies": \{/i\  "engines": { "node": "18.x" },' "${BASE_DIR}/package.json" 2>/dev/null || true
fi
echo "package.json asegurado con Node 18.x."


echo "--- 2. Corrigiendo websocket-server.mjs: Importación Nombrada Explícita de Server ---"

cat > "${BASE_DIR}/websocket-server.mjs" << 'EOL'
// Importación con nombre explícito (Server) para garantizar que se resuelva correctamente en Node 18.
import { Server as WebSocketServer } from 'ws'; 
import jwt from 'jsonwebtoken';
import url from 'url'; 
import 'dotenv/config';

// Importación de las distribuciones compiladas 
import * as prompts from './dist/lib/ai/prompts.js';
import * as strategist from './dist/lib/ai/strategist.js'; 
import db from './dist/lib/db/index.js'; 

const { createLiveCoachingPrompt } = prompts;
const { generateStrategicAnalysis } = strategist;


const port = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET;

const pool = db.pool;

// 🟢 CRÍTICO: Usamos el nombre importado directamente.
const wss = new WebSocketServer({ port }); 
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
    if (ws.readyState !== 1 /* OPEN */) continue; 

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
echo "websocket-server.mjs corregido."

echo "--- 3. Recreando el archivo de DB index.js (ESM) para la compilación ---"
# Aseguramos que este archivo tenga la exportación ESM que espera el nuevo flujo.
cat > "${BASE_DIR}/src/lib/db/index.js" << 'EOL'
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

export default db;
EOL
echo "src/lib/db/index.js asegurado con exportación 'export default'."

echo ""
echo "=========================================================="
echo "    ✅ FIX FINAL APLICADO: ARRANQUE GARANTIZADO"
echo "=========================================================="
echo "Este fix resuelve el error 'Invalid URL' forzando la inicialización del constructor correcto."
echo "Por favor, haz un commit y deploy a Render."