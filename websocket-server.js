const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const url = require('url');
const { Pool } = require('pg');
require('dotenv').config();

// Imports de la distribución compilada
const { createLiveCoachingPrompt } = require('./dist/lib/ai/prompts');
const { generateStrategicAnalysis } = require('./dist/lib/ai/strategist');

const port = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const wss = new WebSocket.Server({ port });
const clients = new Map();

console.log(`✅ Servidor WebSocket de Producción iniciado en el puerto ${port}.`);

// --- CORRECCIÓN: Eliminada la columna "zodiac_sign" de la consulta ---
const fetchUserData = async (userId) => {
  try {
    // Ya no pedimos la columna 'zodiac_sign'
    const res = await pool.query('SELECT id, username, summoner_id, region, live_game_data FROM users WHERE id = $1', [userId]);
    return res.rows[0];
  } catch (error) {
    console.error(`Error al buscar usuario ${userId} en la DB:`, error);
    return null;
  }
};
// --- FIN DE LA CORRECCIÓN ---

wss.on('connection', (ws, req) => {
  const parameters = url.parse(req.url, true).query;
  const token = parameters.token;

  if (!token) {
    ws.close(1008, 'Token no proporcionado');
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      ws.close(1008, 'Token inválido');
      return;
    }

    const userId = decoded.userId;
    clients.set(userId, { ws });
    console.log(`[CONEXIÓN] Usuario ${userId} conectado. Clientes activos: ${clients.size}`);

    ws.on('close', () => {
      clients.delete(userId);
      console.log(`[DESCONEXIÓN] Usuario ${userId} desconectado. Clientes activos: ${clients.size}`);
    });

    ws.on('error', (error) => {
      console.error(`[ERROR] WebSocket para usuario ${userId}:`, error);
    });
  });
});

setInterval(async () => {
  if (clients.size === 0) return;

  for (const [userId, clientData] of clients.entries()) {
    const { ws } = clientData;
    if (ws.readyState !== WebSocket.OPEN) continue;

    const freshUserData = await fetchUserData(userId);
    if (!freshUserData) continue;

    const liveGameData = freshUserData.live_game_data;

    if (liveGameData && freshUserData.subscription_tier === 'PREMIUM') {
        try {
            // --- CORRECCIÓN: Eliminado el envío de "zodiacSign" a la IA ---
            const analysisResult = await generateStrategicAnalysis({
                liveGameData: liveGameData
            });
            // --- FIN DE LA CORRECCIÓN ---

            const messageObject = {
                realtimeAdvice: analysisResult.realtimeAdvice,
                priorityAction: analysisResult.priorityAction || 'ANALYSIS',
                gameTime: liveGameData.gameTime
            };
            
            ws.send(JSON.stringify(messageObject));
            
        } catch (error) {
            console.error(`Error al generar o enviar consejo ÉLITE para ${freshUserData.username}:`, error);
            ws.send(JSON.stringify({ realtimeAdvice: "ERROR CRÍTICO: El enlace táctico con la IA se ha cortado. Concentración manual." }));
        }
        
    } else {
        const message = freshUserData && freshUserData.subscription_tier !== 'PREMIUM'
          ? 'Acceso limitado. Coach en tiempo real es Premium.'
          : 'Coach inactivo. Inicia una partida con la App de escritorio.';
          
        ws.send(JSON.stringify({ realtimeAdvice: message, priorityAction: 'STATUS' }));
    }
  }
}, 10000); // Revisa cada 10 segundos