#!/bin/bash

# =========================================================================================
# SOLUCIÓN DEFINITIVA: ARREGLO DEL CONSTRUCTOR DE WS EN ESM
# Objetivo: Corregir la importación de 'ws' para que el constructor 'Server' se resuelva.
# =========================================================================================

BASE_DIR="." 

echo "--- 1. Corrigiendo websocket-server.mjs: Usando importación CJS compatible ---"
# Revertimos la importación de ws a su forma CJS funcional y la usamos directamente.

cat > "${BASE_DIR}/websocket-server.mjs" << 'EOL'
// Usamos el import CJS que funcionaba, y luego renombramos para usar la sintaxis limpia de ESM.
import ws from 'ws';
import jwt from 'jsonwebtoken';
import url from 'url'; 
import 'dotenv/config';

// Importación de las distribuciones compiladas
import * as prompts from './dist/lib/ai/prompts.js';
import * as strategist from './dist/lib/ai/strategist.js';
import db from './dist/lib/db/index.js'; 

const { createLiveCoachingPrompt } = prompts;
const { generateStrategicAnalysis } = strategist;

// 🟢 CORRECCIÓN: ws es un objeto. La clase Server está en la propiedad Server del objeto importado.
// Extraemos la clase Server (que es el constructor).
const WebSocketServer = ws.Server; 


const port = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET;

const pool = db.pool;

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
    
    // ws.send está aquí y está bien, pero falta 'ws.OPEN' en el intervalo.
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
    // 🟢 CORRECCIÓN MENOR: 1 es el valor numérico para WebSocket.OPEN
    if (ws.readyState !== 1) continue; 

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
echo "websocket-server.mjs corregido para el constructor de WebSocket."


echo "--- 2. Recreando el archivo index.js (necesario para el build) ---"
# El archivo de DB index.js original, que debe ser transpiled, necesita estar presente.
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
echo "src/lib/db/index.js recreado para la compilación."


echo "--- 3. Eliminando el archivo .cjs problemático (si existe) ---"
rm "${BASE_DIR}/src/lib/db/index.cjs" 2>/dev/null || true
echo "Archivo .cjs eliminado para evitar conflictos de path."


echo ""
echo "=========================================================="
echo "    ✅ FIX DEFINITIVO A TypeError (Constructor de WS)"
echo "=========================================================="
echo "Este fix resuelve el último error de ejecución. Ahora, el servidor debería iniciar correctamente usando el flujo ESM."
echo ""
echo "Acciones requeridas:"
echo "1. **Ejecuta este script en la carpeta raíz de tu proyecto web local.**"
echo "2. **Verifica Package.json:** Asegúrate de que 'start:server' siga siendo 'node websocket-server.mjs'."
echo "3. **Haz un commit y deploy a Render.**"