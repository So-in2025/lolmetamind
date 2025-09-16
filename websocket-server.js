// websocket-server.js
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const url = require('url');
const { Pool } = require('pg');
require('dotenv').config();

// Importamos las funciones desde la carpeta 'dist' que será generada por Babel
const { getLiveGameBySummonerId } = require('./dist/services/riotApiService.js');
const { createLiveCoachingPrompt } = require('./dist/lib/ai/prompts.js');
const { generateStrategicAnalysis } = require('./dist/lib/ai/strategist.js'); // Asumimos que la lógica de llamada a Gemini está aquí.

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
    ws.send('👋 ¡Bienvenido al coach en tiempo real! Buscando tu partida...');

    ws.on('close', () => {
      console.log(`💔 Cliente desconectado: ${userDataFromDB.username}`);
      clients.delete(ws);
    });
    
    ws.on('error', (error) => console.error(`Error en la conexión de ${userDataFromDB.username}:`, error));

  } catch (err) {
    ws.close(1008, "Token inválido");
  }
});

// --- El Motor de Coaching en Tiempo Real ---
setInterval(async () => {
  if (clients.size === 0) return;

  console.log(`\n🔎 Verificando partidas activas para ${clients.size} cliente(s)...`);

  for (const [ws, userData] of clients.entries()) {
    if (ws.readyState !== WebSocket.OPEN || !userData.summoner_id || !userData.region) continue;

    try {
      const liveGame = await getLiveGameBySummonerId(userData.summoner_id, userData.region);
      
      if (liveGame) {
        console.log(`[${userData.username}] Partida encontrada. Generando consejo de IA...`);
        
        // Usamos el estratega completo para generar el consejo
        const prompt = createLiveCoachingPrompt(liveGame, userData.username);
        const analysis = await generateStrategicAnalysis({ customPrompt: prompt }); // Asumimos que el estratega puede tomar un prompt custom
        
        const tip = analysis.candidates[0].content.parts[0].text;
        
        ws.send(`[Minuto ${Math.floor(liveGame.gameLength / 60)}]: ${tip}`);
      }
    } catch (error) {
      console.error(`Error procesando al cliente ${userData.username}:`, error);
    }
  }
}, 60000); // Revisa cada 60 segundos para no exceder los límites de la API de desarrollo
