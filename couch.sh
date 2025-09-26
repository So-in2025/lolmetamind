# =========================================================================================
# SOLUCIÓN DE RAÍZ: CONVERSIÓN A ES MODULES (ESM) DE FORMA DEFINITIVA
# El flujo correcto para Node v22.
# =========================================================================================

BASE_DIR="." 

echo "--- 1. Renombrando websocket-server.js a websocket-server.mjs (La solución de raíz) ---"
mv "${BASE_DIR}/websocket-server.js" "${BASE_DIR}/websocket-server.mjs"
echo "Archivo de entrada renombrado a websocket-server.mjs."


echo "--- 2. Convirtiendo websocket-server.mjs a sintaxis ESM pura ---"
# Reescritura completa del archivo de entrada para usar sintaxis 'import'
cat > "${BASE_DIR}/websocket-server.mjs" << 'EOL'
import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import url from 'url'; 
import 'dotenv/config';

// Importación de las distribuciones compiladas (Usando import nativo)
import * as prompts from './dist/lib/ai/prompts.js';
import * as strategist from './dist/lib/ai/strategist.js';
import db from './dist/lib/db/index.js'; // Importación ESM del módulo de DB

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
echo "websocket-server.mjs convertido a ESM."


echo "--- 3. Ajustando el archivo de DB a exportación ESM (necesario para el nuevo flujo) ---"
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


echo "--- 4. ADVERTENCIA FINAL (PASO MANUAL) ---"
echo "🚨 ADVERTENCIA: Debe cambiar manualmente la línea 'start:server' en package.json"
echo "DE: \"start:server\": \"npm run build:server && node websocket-server.js\""
echo "A: \"start:server\": \"npm run build:server && node websocket-server.mjs\""
echo "Una vez hecho esto, haz commit y deploy. ¡Esta es la solución de raíz!"