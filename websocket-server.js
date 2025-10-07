// websocket-server.js (versión final PRO)
// ============================================================
// WebSocket Server con integración AI, prompts SSML-aware y conexión estable
// - Bidireccional heartbeat (PING/PONG)
// - safeSend() para evitar cierres por errores en send()
// - IDs únicos por cliente, logs detallados y manejo robusto de errores
// - API de eventos: QUEUE_UPDATE, CHAMP_SELECT_UPDATE, LIVE_COACHING_UPDATE
// ============================================================

const WebSocket = require('ws');
const path = require('path');
const crypto = require('crypto');
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

// 🚨 CORRECCIÓN CRÍTICA: Render pasa el puerto requerido en process.env.PORT
// Se usa 8080 solo como fallback local si la variable PORT no existe.
const SERVER_PORT = process.env.PORT || 8080; // Leer el puerto asignado por Render (ej. 10000)

const wss = new WebSocket.Server({ port: SERVER_PORT });

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
  safeSend(ws, { eventType: 'ERROR', data: { message: `Server error: ${errorMessage}` } });
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

// ============================================================
// EVENTOS CUSTOM DE LA IA
// ============================================================
const eventHandlers = {
  'PING': (_, ws) => {
    // 👋 Respuesta al ping del cliente
    safeSend(ws, { eventType: 'PONG' });
    ws.isAlive = true;
  },

  'QUEUE_UPDATE': async ({ userData }, ws) => {
    try {
      validate('userData', userData);
      console.log('[EVENT] QUEUE_UPDATE -> preparando prompt preGame');

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
    try {
      validate('userData', userData);
      console.log('[EVENT] CHAMP_SELECT_UPDATE -> generando análisis de draft');
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
    try {
      validate('userData', userData);
      if (!data || !data.liveGameData) throw new Error('liveGameData missing');
      console.log('[EVENT] LIVE_COACHING_UPDATE -> generando consejo en vivo');
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
  console.log(`[WS] ✅ Cliente conectado -> id=${ws.id}`);

  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', async (rawMessage) => {
    let message;
    try {
      message = JSON.parse(rawMessage.toString());
      const { eventType } = message;
      if (!eventType) throw new Error("Message missing 'eventType'");
      console.log(`[WS:${ws.id}] 📩 Recibido evento: ${eventType}`);

      const handler = eventHandlers[eventType];
      if (typeof handler === 'function') {
        await handler(message, ws);
      } else {
        console.warn(`[WS:${ws.id}] ⚠️ Evento desconocido: ${eventType}`);
        safeSend(ws, { eventType: 'ERROR', data: { message: 'Unknown event type' } });
      }
    } catch (err) {
      handleError(err, ws, 'message');
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`[WS:${ws.id}] ❌ Cliente desconectado (code=${code}, reason=${reason || 'none'})`);
  });

  ws.on('error', (err) => handleError(err, ws, 'connection'));
});

// ============================================================
// HEARTBEAT SERVIDOR -> CLIENTE
// ============================================================
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log(`[WS] 🔴 Cliente inactivo, terminando conexión -> id=${ws.id}`);
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
