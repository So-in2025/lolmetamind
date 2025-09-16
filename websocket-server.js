// websocket-server.js
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const url = require('url');
const { getLiveGameBySummonerId } = require('./dist/riotApiService'); // Usaremos una versión compilada
const { generateLiveCoachingTip } = require('./dist/aiService'); // Usaremos una versión compilada

const port = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET;

const wss = new WebSocket.Server({ port });

// Almacenará los clientes conectados y sus datos de usuario
const clients = new Map();

console.log(`✅ Servidor WebSocket para el Coach en Tiempo Real iniciado en el puerto ${port}.`);

wss.on('connection', (ws, req) => {
  const parameters = new URLSearchParams(url.parse(req.url).search);
  const token = parameters.get('token');

  if (!token) {
    console.log('Cliente intentó conectar sin token. Conexión rechazada.');
    ws.close(1008, "Token no proporcionado");
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    
    // Guardamos el cliente con sus datos de usuario. En un entorno real,
    // aquí haríamos una consulta a la DB para obtener summoner_id y region.
    // Por ahora, lo simulamos hasta que la DB esté conectada.
    clients.set(ws, { 
        userId: userId, 
        username: decoded.username,
        // TODO: Reemplazar estos datos con una consulta a la base de datos
        // usando el userId para obtener los datos del invocador vinculado.
        summonerId: "SIMULATED_SUMMONER_ID", 
        region: "LAS"
    });

    console.log(`🔗 Cliente conectado: ${decoded.username} (ID: ${userId})`);
    ws.send('👋 ¡Bienvenido al coach en tiempo real! Buscando tu partida...');

    ws.on('close', () => {
      console.log(`💔 Cliente desconectado: ${decoded.username}`);
      clients.delete(ws);
    });
    
    ws.on('error', (error) => {
        console.error(`Error en la conexión de ${decoded.username}:`, error);
    });

  } catch (err) {
    console.log(`Token inválido. Conexión rechazada. Error: ${err.message}`);
    ws.close(1008, "Token inválido");
  }
});

// --- El Motor de Coaching en Tiempo Real ---
// Este intervalo es el corazón del sistema.
setInterval(async () => {
  if (clients.size === 0) return;

  console.log(`\n🔎 Verificando partidas activas para ${clients.size} cliente(s)...`);

  for (const [ws, userData] of clients.entries()) {
    if (ws.readyState !== WebSocket.OPEN) continue;

    try {
      // TODO: Usar userData.summonerId y userData.region reales de la DB
      const liveGame = await getLiveGameBySummonerId(userData.summonerId, userData.region);
      
      if (liveGame) {
        console.log(`[${userData.username}] Partida encontrada. Generando consejo de IA...`);
        const tip = await generateLiveCoachingTip(liveGame, userData.username);
        ws.send(`[Minuto ${Math.floor(liveGame.gameLength / 60)}]: ${tip}`);
      } else {
        // Esto es normal, el usuario no está en partida.
        // console.log(`[${userData.username}] No se encontró partida activa.`);
      }
    } catch (error) {
      console.error(`Error procesando al cliente ${userData.username}:`, error);
      // Podríamos enviar un mensaje de error al cliente si es necesario
      // ws.send('Error al obtener datos de la partida.');
    }
  }
}, 30000); // Revisa cada 30 segundos
