// websocket-server.js
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const url = require('url');
const { Pool } = require('pg');
require('dotenv').config();

const { getLiveGameBySummonerId } = require('./dist/services/riotApiService');
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

const fetchUserData = async (userId) => {
  try {
    const res = await pool.query('SELECT id, username, summoner_id, region FROM users WHERE id = $1', [userId]);
    return res.rows[0];
  } catch (error) {
    console.error(`Error al buscar usuario ${userId} en la DB:`, error);
    return null;
  }
};

wss.on('connection', async (ws, req) => {
  const parameters = new URLSearchParams(url.parse(req.url).search);
  const token = parameters.get('token');

  if (!token) {
    ws.close(1008, "Token no proporcionado");
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userDataFromDB = await fetchUserData(decoded.userId);

    if (!userDataFromDB) {
      console.log(`Usuario con ID ${decoded.userId} no encontrado en la DB. Conexión rechazada.`);
      ws.close(1008, "Usuario no encontrado");
      return;
    }
    
    clients.set(ws, userDataFromDB);
    console.log(`🔗 Cliente conectado y verificado: ${userDataFromDB.username}`);
    
    const welcomeMessage = JSON.stringify({
      realtimeAdvice: '👋 ¡Bienvenido! Buscando tu partida...',
      buildRecommendation: { items: [], runes: [] },
      strategicAdvice: 'Elige un plan de juego inicial: agresivo o pasivo.',
    });
    ws.send(welcomeMessage);

    ws.on('close', () => {
      console.log(`💔 Cliente desconectado: ${userDataFromDB.username}`);
      clients.delete(ws);
    });
    
    ws.on('error', (error) => console.error(`Error en la conexión de ${userDataFromDB.username}:`, error));

  } catch (err) {
    ws.close(1008, "Token inválido");
  }
});

// --- El Motor de Coaching en Tiempo Real (Modificado) ---
setInterval(async () => {
  if (clients.size === 0) return;

  console.log(`\n🔎 Verificando partidas activas para ${clients.size} cliente(s)...`);

  for (const [ws, userData] of clients.entries()) {
    if (ws.readyState !== WebSocket.OPEN || !userData.summoner_id || !userData.region) continue;

    try {
      const liveGame = await getLiveGameBySummonerId(userData.summoner_id, userData.region);
      
      if (liveGame) {
        console.log(`[${userData.username}] Partida encontrada. Generando consejos de IA...`);
        
        // Simulación de los 3 tipos de consejos
        const realtimeTip = "¡Cuidado! El jungla enemigo está en el río. Juega con cautela.";
        const buildTip = {
          items: ["Doran's Ring", "Luden's Companion"],
          runes: ["Arcane Comet", "Manaflow Band"]
        };
        const strategicTip = "En los próximos minutos, enfócate en asegurar el Cangrejo Escurridizo para ganar control de visión.";
        
        // Enviamos un único objeto JSON
        const messageObject = {
            realtimeAdvice: `[Minuto ${Math.floor(liveGame.gameLength / 60)}]: ${realtimeTip}`,
            buildRecommendation: buildTip,
            strategicAdvice: strategicTip,
        };
        
        ws.send(JSON.stringify(messageObject));
      }
    } catch (error) {
      console.error(`Error procesando al cliente ${userData.username}:`, error);
    }
  }
}, 10000); // Revisa cada 10 segundos