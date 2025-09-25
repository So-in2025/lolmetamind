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
    const res = await pool.query('SELECT id, username, summoner_id, region FROM users WHERE id = $1', [userId]);
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
        // Si no encontramos al usuario, no podemos continuar.
        // Esto puede pasar si el usuario fue borrado pero el token sigue activo.
        continue;
    };

    // NOTA: La lógica original usaba 'live_game_data', que no existe.
    // La app de escritorio ahora envía los datos del juego a una API REST,
    // y el WebSocket se usa para enviar los consejos de vuelta.
    // Vamos a enviar un consejo genérico por ahora para confirmar que la conexión funciona.

    // A futuro, aquí deberías leer los datos del juego que la app de escritorio guarda
    // en la base de datos a través de una API REST.

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