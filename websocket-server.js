// websocket-server.js (versión final PRO con Autenticación JWT)
// ============================================================
// WebSocket Server con integración AI, autenticación JWT y conexión estable
// - Bidireccional heartbeat (PING/PONG)
// - Handler USER_AUTH: verifica el token JWT antes de cualquier operación.
// - safeSend() para evitar cierres por errores en send()
// ============================================================

const WebSocket = require('ws');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken'); // 🚨 NUEVO: Importar JWT
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

let aiOrchestrator = null;
let prompts = null;
try {
  aiOrchestrator = require('./dist/lib/ai/aiOrchestrator').default;
  prompts = require('./dist/lib/ai/prompts');
} catch (err) {
  aiOrchestrator = require('./src/lib/ai/aiOrchestrator').default;
  prompts = require('./src/lib/ai/prompts');
}

// 🚨 CLAVE SECRETA: Usar la misma clave de fallback que los endpoints Next.js
const JWT_SECRET = process.env.JWT_SECRET || 'p2s5v8y/B?E(H+MbQeThWmZq4t7w!z%C&F)J@NcRfUjXn2r5u8x/A?D*G-KaPdSg'; 

// 🚨 CORRECCIÓN CRÍTICA: Render pasa el puerto requerido en process.env.PORT
const SERVER_PORT = process.env.PORT || 8080;

// Crear un servidor HTTP estándar
const server = http.createServer((req, res) => {
  // Render hace proxy a la URL raíz del puerto HTTP para checks de salud.
  // Tu WebSocket Server no es un servidor HTTP normal, pero responder a "/" es buena práctica.
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebSocket server is running (HTTP proxy works).\n');
  } else {
    res.writeHead(404);
    res.end();
  }
});

const wss = new WebSocket.Server({ server }); // <-- ¡Aquí se adjunta al servidor HTTP!

// ============================================================
// CONFIGURACIÓN KEEPALIVE
// ============================================================
const HEARTBEAT_INTERVAL = 30 * 1000; // 30s
console.log(`⚙️  WebSocket KeepAlive configurado cada ${HEARTBEAT_INTERVAL / 1000}s`);

// ============================================================
// UTILIDADES
// ============================================================
const validate = (schema, data) => {
  if (!data) throw new Error(`Schema '${schema}' missing data.`);
  if (schema === 'userData' && (typeof data.summonerName !== 'string' || !data.zodiacSign)) {
    throw new Error('userData invalid (requires summonerName and zodiacSign).');
  }
  return true;
};

const handleError = (error, ws, context = 'general') => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`🚨 Error [${context}]:`, errorMessage);
  // Solo enviar ERROR si la conexión está abierta para evitar safeSend/log loop
  if (ws && ws.readyState === WebSocket.OPEN) {
    safeSend(ws, { eventType: 'ERROR', data: { message: `Server error: ${errorMessage}` } });
  }
};

function safeSend(ws, payload) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  try {
    ws.send(JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn('[WS] safeSend failed:', err.message);
    return false;
  }
}

/**
 * Función de guardia: verifica si el cliente está autenticado.
 * @param {WebSocket} ws 
 * @param {string} context 
 * @returns {boolean}
 */
const ensureAuthenticated = (ws, context = 'Acceso a IA') => {
    if (!ws.isAuthenticated || !ws.userId) {
        handleError(new Error('Acceso denegado. Cliente no autenticado.'), ws, context);
        return false;
    }
    return true;
};

// ============================================================
// EVENTOS CUSTOM DE LA IA Y AUTENTICACIÓN
// ============================================================
const eventHandlers = {
  'PING': (_, ws) => {
    // 👋 Respuesta al ping del cliente
    safeSend(ws, { eventType: 'PONG' });
    ws.isAlive = true;
  },
  
  // 🚨 NUEVO HANDLER: CRÍTICO para el momento 1 de la conexión
  'USER_AUTH': ({ token, userId, username }, ws) => {
      try {
          if (!token) throw new Error('Token de autenticación JWT faltante.');

          const decoded = jwt.verify(token, JWT_SECRET);
          
          // Almacenar datos en el objeto WebSocket
          ws.userId = decoded.id;
          ws.username = decoded.username;
          ws.isAuthenticated = true;

          safeSend(ws, { eventType: 'AUTH_SUCCESS', data: { username: decoded.username } });
          console.log(`[WS:${ws.id}] 🔐 Cliente autenticado: ${decoded.username}`);

      } catch (err) {
          handleError(new Error('Token JWT inválido o expirado.'), ws, 'USER_AUTH');
          // En caso de fallo de autenticación, cerramos la conexión
          ws.terminate(); 
      }
  },

  'QUEUE_UPDATE': async ({ userData }, ws) => {
    if (!ensureAuthenticated(ws, 'QUEUE_UPDATE')) return; // GUARDIA

    try {
      validate('userData', userData);
      console.log(`[EVENT] QUEUE_UPDATE -> preparando prompt preGame para: ${ws.username}`);

      // Usar los datos de rendimiento de ejemplo como en la versión original
      const performanceData = {
        weakness1: 'Control de oleadas en early',
        weakness2: 'Posicionamiento en teamfights tardías'
      };

      const prompt = prompts.createPreGamePrompt(userData, performanceData);
      aiOrchestrator.getOrchestratedResponse({
        prompt,
        expectedType: 'object',
        kind: 'realtime',
        cacheTTL: 8 * 60 * 1000
      }).then((res) => {
        console.log('[EVENT] QUEUE_ADVICE -> enviado al cliente');
        safeSend(ws, { eventType: 'QUEUE_ADVICE', data: res });
      }).catch(err => handleError(err, ws, 'QUEUE_UPDATE'));
    } catch (err) {
      handleError(err, ws, 'QUEUE_UPDATE');
    }
  },

  'CHAMP_SELECT_UPDATE': async ({ data, userData }, ws) => {
    if (!ensureAuthenticated(ws, 'CHAMP_SELECT_UPDATE')) return; // GUARDIA

    try {
      validate('userData', userData);
      console.log(`[EVENT] CHAMP_SELECT_UPDATE -> generando análisis de draft para: ${ws.username}`);
      const prompt = prompts.createChampSelectPrompt(data, userData);
      const res = await aiOrchestrator.getOrchestratedResponse({
        prompt,
        expectedType: 'object',
        kind: 'realtime',
        cacheTTL: 5 * 60 * 1000
      });
      safeSend(ws, { eventType: 'CHAMP_SELECT_ADVICE', data: res });
    } catch (err) {
      handleError(err, ws, 'CHAMP_SELECT_UPDATE');
    }
  },

  'LIVE_COACHING_UPDATE': async ({ data, userData }, ws) => {
    if (!ensureAuthenticated(ws, 'LIVE_COACHING_UPDATE')) return; // GUARDIA

    try {
      validate('userData', userData);
      if (!data || !data.liveGameData) throw new Error('liveGameData missing');
      console.log(`[EVENT] LIVE_COACHING_UPDATE -> generando consejo en vivo para: ${ws.username}`);
      const prompt = prompts.createLiveCoachingPrompt(data.liveGameData, userData.zodiacSign);
      const res = await aiOrchestrator.getOrchestratedResponse({
        prompt,
        expectedType: 'object',
        kind: 'realtime',
        cacheTTL: 60 * 1000
      });
      safeSend(ws, { eventType: 'IN_GAME_ADVICE', data: res });
    } catch (err) {
      handleError(err, ws, 'LIVE_COACHING_UPDATE');
    }
  }
};

// ============================================================
// GESTIÓN DE CONEXIONES
// ============================================================
wss.on('connection', (ws) => {
  ws.id = crypto.randomBytes(6).toString('hex');
  ws.isAlive = true;
  // Inicializar estado de autenticación a falso
  ws.isAuthenticated = false; 
  ws.userId = null;
  ws.username = 'Unauthenticated';

  console.log(`[WS] ✅ Cliente conectado -> id=${ws.id}`);

  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', async (rawMessage) => {
    let message;
    try {
      message = JSON.parse(rawMessage.toString());
      const { eventType } = message;
      if (!eventType) throw new Error("Message missing 'eventType'");
      
      // Mostrar solo el ID si no está autenticado, el username si lo está
      const clientIdentifier = ws.isAuthenticated ? ws.username : `id=${ws.id}`;
      console.log(`[WS:${clientIdentifier}] 📩 Recibido evento: ${eventType}`);

      const handler = eventHandlers[eventType];
      if (typeof handler === 'function') {
        await handler(message, ws);
      } else {
        console.warn(`[WS:${clientIdentifier}] ⚠️ Evento desconocido: ${eventType}`);
        safeSend(ws, { eventType: 'ERROR', data: { message: 'Unknown event type' } });
      }
    } catch (err) {
      handleError(err, ws, 'message');
    }
  });

  ws.on('close', (code, reason) => {
    const clientIdentifier = ws.username || `id=${ws.id}`;
    console.log(`[WS:${clientIdentifier}] ❌ Cliente desconectado (code=${code}, reason=${reason || 'none'})`);
  });

  ws.on('error', (err) => handleError(err, ws, 'connection'));
});

// === STARTUP ===
server.listen(RENDER_INJECTED_PORT, () => { // <-- El servidor HTTP escucha el puerto correcto
    console.log(`✅ WebSocket server iniciado en puerto ${RENDER_INJECTED_PORT}`);
});

// ============================================================
// HEARTBEAT SERVIDOR -> CLIENTE
// ============================================================
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      const clientIdentifier = ws.username || `id=${ws.id}`;
      console.log(`[WS] 🔴 Cliente inactivo, terminando conexión -> ${clientIdentifier}`);
      return ws.terminate();
    }
    ws.isAlive = false;
    try { ws.ping(() => {}); } catch (e) { /* ignore */ }
  });
}, HEARTBEAT_INTERVAL);
heartbeatInterval.unref?.();

// ============================================================
// STARTUP
// ============================================================
console.log(`✅ WebSocket server iniciado en puerto ${SERVER_PORT}`);