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

// --- CORRECCIÓN FINAL: Usamos las columnas que SÍ existen en tu DB ---
const fetchUserData = async (userId) => {
  try {
    // Seleccionamos las columnas correctas de la lista que me proporcionaste.
    // Ya no pedimos 'live_game_data' ni 'zodiac_sign'.
    const res = await pool.query('SELECT id, username, summoner_id, region, subscription_tier FROM users WHERE id = $1', [userId]);
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
    console.log(`[CONEXIÓN ESTABLE] Usuario ${userId} conectado. Clientes activos: ${clients.size}`);

    ws.on('close', () => {
      clients.delete(userId);
      console.log(`[DESCONEXIÓN] Usuario ${userId} desconectado. Clientes activos: ${clients.size}`);
    });

    ws.on('error', (error) => {
      console.error(`[ERROR] WebSocket para usuario ${userId}:`, error);
    });
  });
});

// El intervalo que envía los consejos (ahora no debería crashear)
setInterval(async () => {
  if (clients.size === 0) return;

  for (const [userId, clientData] of clients.entries()) {
    const { ws } = clientData;
    if (ws.readyState !== WebSocket.OPEN) continue;

    const userData = await fetchUserData(userId);
    if (!userData) {
      continue;
    };

    // NOTA: La lógica para obtener los datos del juego y generar consejos con la IA
    // se debe implementar aquí, leyendo los datos que la app de escritorio guarde
    // en la base de datos. Por ahora, enviamos un consejo de prueba para confirmar que la conexión funciona.
    try {
        const messageObject = {
            realtimeAdvice: `Consejo para ${userData.username}: ¡La conexión con el coach está funcionando!`,
            priorityAction: 'STATUS',
        };
        ws.send(JSON.stringify(messageObject));
    } catch (error) {
        console.error(`Error al enviar consejo para ${userData.username}:`, error);
    }
  }
}, 10000); // Revisa cada 10 segundos

