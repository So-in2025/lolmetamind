// websocket-server-debug.js
// ============================================================
// WebSocket Server FULL DEBUG / PRO-DEV
// Integración AI + JWT + Logs detallados + Heartbeat robusto
// ============================================================

const WebSocket = require('ws');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken'); 
const http = require('http'); 
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

// ========================
// IMPORTS AI
// ========================
let aiOrchestrator = null;
let prompts = null;

try {
  aiOrchestrator = require('./dist/lib/ai/aiOrchestrator').default;
  prompts = require('./dist/lib/ai/prompts');
  console.log('[DEBUG] Módulos AI cargados desde dist ✅');
} catch (err) {
  aiOrchestrator = require('./src/lib/ai/aiOrchestrator').default;
  prompts = require('./src/lib/ai/prompts');
  console.log('[DEBUG] Módulos AI cargados desde src ✅');
}

// ========================
// CONFIG JWT
// ========================
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_super_secret_key';
console.log('[DEBUG] JWT_SECRET cargado ✅');

// ========================
// SERVIDOR HTTP (proxy/healthcheck)
// ========================
const PORT = process.env.PORT || 8080;
const server = http.createServer((req, res) => {
  console.log(`[DEBUG][HTTP] Request -> ${req.method} ${req.url}`);
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebSocket server is running (HTTP proxy works).\n');
  } else {
    res.writeHead(404);
    res.end();
  }
});

// ========================
// ESCUCHA SERVER
// ========================
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ WebSocket server listening on 0.0.0.0:${PORT}`);
  console.log('[DEBUG] Revisa que el puerto esté disponible y no haya conflicto de binding.');
});

// ========================
// INICIALIZAR WEBSOCKET
// ========================
const wss = new WebSocket.Server({ server });
console.log('[DEBUG] WebSocket.Server inicializado ✅');

// ========================
// KEEPALIVE HEARTBEAT
// ========================
const HEARTBEAT_INTERVAL = 30 * 1000; // 30s
console.log(`[DEBUG] Heartbeat configurado cada ${HEARTBEAT_INTERVAL / 1000}s`);

// ========================
// UTILIDADES
// ========================
const validate = (schema, data) => {
  if (!data) throw new Error(`Schema '${schema}' missing data.`);
  if (schema === 'userData' && (typeof data.summonerName !== 'string' || !data.zodiacSign)) {
    throw new Error('userData invalid (requires summonerName and zodiacSign).');
  }
  return true;
};

const handleError = (error, ws, context = 'general') => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`🚨 [ERROR][${context}]:`, errorMessage);
  if (ws && ws.readyState === WebSocket.OPEN) {
    safeSend(ws, { eventType: 'ERROR', data: { message: `Server error: ${errorMessage}` } });
  }
};

function safeSend(ws, payload) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn('[DEBUG][safeSend] Socket no abierto o null');
    return false;
  }
  try {
    ws.send(JSON.stringify(payload));
    console.log(`[DEBUG][safeSend] Evento enviado: ${payload.eventType}`);
    return true;
  } catch (err) {
    console.warn('[DEBUG][safeSend] Falló:', err.message);
    return false;
  }
}

const ensureAuthenticated = (ws, context = 'Acceso a IA') => {
  if (!ws.isAuthenticated || !ws.userId) {
    handleError(new Error('Acceso denegado. Cliente no autenticado.'), ws, context);
    return false;
  }
  return true;
};

// ========================
// EVENT HANDLERS
// ========================
const eventHandlers = {
  'PING': (_, ws) => {
    safeSend(ws, { eventType: 'PONG' });
    ws.isAlive = true;
    console.log(`[DEBUG][PING] Cliente vivo: ${ws.username}`);
  },

  'USER_AUTH': ({ token }, ws) => {
    console.log('[DEBUG][USER_AUTH] Intentando autenticación...');
    try {
      if (!token) throw new Error('Token JWT faltante');
      const decoded = jwt.verify(token, JWT_SECRET);
      ws.userId = decoded.id;
      ws.username = decoded.username;
      ws.isAuthenticated = true;
      safeSend(ws, { eventType: 'AUTH_SUCCESS', data: { username: decoded.username } });
      console.log(`[DEBUG][USER_AUTH] Autenticación exitosa: ${ws.username}`);
    } catch (err) {
      handleError(new Error('Token JWT inválido o expirado'), ws, 'USER_AUTH');
      ws.terminate();
      console.log('[DEBUG][USER_AUTH] Cliente terminado por JWT inválido ❌');
    }
  },

  'QUEUE_UPDATE': async ({ userData }, ws) => {
    console.log(`[DEBUG][QUEUE_UPDATE] Evento recibido`);
    if (!ensureAuthenticated(ws, 'QUEUE_UPDATE')) return;
    try {
      validate('userData', userData);
      const performanceData = { weakness1: 'Control de oleadas early', weakness2: 'Posicionamiento late' };
      const prompt = prompts.createPreGamePrompt(userData, performanceData);
      const res = await aiOrchestrator.getOrchestratedResponse({
        prompt, expectedType: 'object', kind: 'realtime', cacheTTL: 8*60*1000
      });
      safeSend(ws, { eventType: 'QUEUE_ADVICE', data: res });
      console.log('[DEBUG][QUEUE_UPDATE] Advice enviado al cliente');
    } catch (err) {
      handleError(err, ws, 'QUEUE_UPDATE');
    }
  },

  'CHAMP_SELECT_UPDATE': async ({ data, userData }, ws) => {
    console.log('[DEBUG][CHAMP_SELECT_UPDATE] Evento recibido');
    if (!ensureAuthenticated(ws, 'CHAMP_SELECT_UPDATE')) return;
    try {
      validate('userData', userData);
      const prompt = prompts.createChampSelectPrompt(data, userData);
      const res = await aiOrchestrator.getOrchestratedResponse({ prompt, expectedType:'object', kind:'realtime', cacheTTL:5*60*1000 });
      safeSend(ws, { eventType:'CHAMP_SELECT_ADVICE', data:res });
      console.log('[DEBUG][CHAMP_SELECT_UPDATE] Advice enviado al cliente');
    } catch (err) {
      handleError(err, ws, 'CHAMP_SELECT_UPDATE');
    }
  },

  'LIVE_COACHING_UPDATE': async ({ data, userData }, ws) => {
    console.log('[DEBUG][LIVE_COACHING_UPDATE] Evento recibido');
    if (!ensureAuthenticated(ws, 'LIVE_COACHING_UPDATE')) return;
    try {
      validate('userData', userData);
      if (!data || !data.liveGameData) throw new Error('liveGameData missing');
      const prompt = prompts.createLiveCoachingPrompt(data.liveGameData, userData.zodiacSign);
      const res = await aiOrchestrator.getOrchestratedResponse({ prompt, expectedType:'object', kind:'realtime', cacheTTL:60*1000 });
      safeSend(ws, { eventType:'IN_GAME_ADVICE', data:res });
      console.log('[DEBUG][LIVE_COACHING_UPDATE] Advice en vivo enviado');
    } catch (err) {
      handleError(err, ws, 'LIVE_COACHING_UPDATE');
    }
  }
};

// ========================
// GESTIÓN DE CONEXIONES
// ========================
wss.on('connection', ws => {
  ws.id = crypto.randomBytes(6).toString('hex');
  ws.isAlive = true;
  ws.isAuthenticated = false;
  ws.userId = null;
  ws.username = 'Unauthenticated';

  console.log(`[DEBUG][CONNECTION] Cliente conectado -> id=${ws.id}`);

  ws.on('pong', () => {
    ws.isAlive = true;
    console.log(`[DEBUG][PONG] Cliente responde -> ${ws.username}`);
  });

  ws.on('message', async rawMessage => {
    console.log(`[DEBUG][MESSAGE] Recibido: ${rawMessage}`);
    try {
      const message = JSON.parse(rawMessage.toString());
      const { eventType } = message;
      if (!eventType) throw new Error("Message missing 'eventType'");
      const clientIdentifier = ws.isAuthenticated ? ws.username : `id=${ws.id}`;
      const handler = eventHandlers[eventType];
      if (typeof handler === 'function') await handler(message, ws);
      else {
        console.warn(`[DEBUG][MESSAGE] Evento desconocido: ${eventType}`);
        safeSend(ws, { eventType:'ERROR', data:{ message:'Unknown event type' } });
      }
    } catch (err) {
      handleError(err, ws, 'message');
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`[DEBUG][CLOSE] Cliente desconectado -> id=${ws.id}, code=${code}, reason=${reason || 'none'}`);
  });

  ws.on('error', err => handleError(err, ws, 'connection'));
});

// ========================
// HEARTBEAT SERVER -> CLIENT
// ========================
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) {
      console.log(`[DEBUG][HEARTBEAT] Cliente inactivo, terminando -> ${ws.username}`);
      return ws.terminate();
    }
    ws.isAlive = false;
    try { ws.ping(() => {}); } catch(e){ console.log('[DEBUG][HEARTBEAT] ping fallo'); }
  });
}, HEARTBEAT_INTERVAL);
heartbeatInterval.unref?.();

console.log('[DEBUG] WebSocket server debug listo 🚀');
