// websocket-server.js (actualizado) - integra AI Orchestrator con caching y pre-cache
// ============================================================
// Servidor WebSocket con manejo astro-técnico y orquestación AI
// PRO-DEV: usa getOrchestratedResponse para todas las llamadas a IA
// ============================================================

const WebSocket = require('ws');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

// Import desde dist si compilas, o desde src en dev.
let aiOrchestrator = null;
let prompts = null;
try {
  aiOrchestrator = require('./dist/lib/ai/aiOrchestrator').default;
  prompts = require('./dist/lib/ai/prompts');
} catch (err) {
  // Fallback a src para desarrollo local sin build
  aiOrchestrator = require('./src/lib/ai/aiOrchestrator').default;
  prompts = require('./src/lib/ai/prompts');
}

const SERVER_PORT = process.env.WS_PORT || 8080;
const wss = new WebSocket.Server({ port: SERVER_PORT });

const validate = (schema, data) => {
  if (!data) throw new Error(`Datos requeridos por el esquema '${schema}' ausentes.`);
  if (schema === 'userData' && (typeof data.summonerName !== 'string' || !data.zodiacSign)) {
    throw new Error('userData inválido (se requiere summonerName y zodiacSign).');
  }
  return true;
};

const handleError = (error, ws, context = 'general') => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`🚨 Error en [${context}]:`, errorMessage);
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify({ eventType: 'ERROR', data: { message: `Error servidor: ${errorMessage}` } }));
    } catch (e) {
      console.warn('[WS] No pudimos enviar el error al cliente');
    }
  }
};

// Event handlers (usando aiOrchestrator)
const eventHandlers = {
  'QUEUE_UPDATE': async ({ userData }, ws) => {
    try {
      validate('userData', userData);
      console.log('[EVENTO] QUEUE_UPDATE recibido, preparando preGame prompt y precache...');

      // Simular extracción en DB (puedes reemplazar por getSql)
      const performanceData = {
        weakness1: "Control de oleadas en early",
        weakness2: "Posicionamiento en teamfights tardías"
      };

      const prompt = prompts.createPreGamePrompt(userData, performanceData);

      // Precache: generamos y guardamos en cache por si el cliente pide inmediatamente
      // TTL corto porque es prepartida (ej 8 minutos)
      aiOrchestrator.getOrchestratedResponse({
        prompt,
        expectedType: 'object',
        kind: 'realtime',
        cacheTTL: 8 * 60 * 1000, // 8 min
      }).then((res) => {
        // Envio inmediato al cliente cuando AI responde (flujo normal)
        if (ws.readyState === WebSocket.OPEN) {
          console.log('[EVENTO] Enviando QUEUE_ADVICE al cliente.');
          ws.send(JSON.stringify({ eventType: 'QUEUE_ADVICE', data: res }));
        }
      }).catch(err => handleError(err, ws, 'QUEUE_UPDATE'));

    } catch (err) {
      handleError(err, ws, 'QUEUE_UPDATE');
    }
  },

  'CHAMP_SELECT_UPDATE': async ({ data, userData }, ws) => {
    try {
      validate('userData', userData);
      console.log('[EVENTO] CHAMP_SELECT_UPDATE recibido, generando análisis de draft...');

      const prompt = prompts.createChampSelectPrompt(data, userData);

      // Dedupe + cache + call
      const res = await aiOrchestrator.getOrchestratedResponse({
        prompt,
        expectedType: 'object',
        kind: 'realtime', // draft => realtime
        cacheTTL: 5 * 60 * 1000, // 5 min cache
      });

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ eventType: 'CHAMP_SELECT_ADVICE', data: res }));
      }
    } catch (err) {
      handleError(err, ws, 'CHAMP_SELECT_UPDATE');
    }
  },

  'LIVE_COACHING_UPDATE': async ({ data, userData }, ws) => {
    try {
      validate('userData', userData);
      if (!data.liveGameData) {
        throw new Error('liveGameData faltante en payload.');
      }
      console.log('[EVENTO] LIVE_COACHING_UPDATE recibido, generando consejo en vivo...');

      const prompt = prompts.createLiveCoachingPrompt(data.liveGameData, userData.zodiacSign);

      // Live coaching: preferimos latencia, modelo realtime y TTL muy corto
      const res = await aiOrchestrator.getOrchestratedResponse({
        prompt,
        expectedType: 'object',
        kind: 'realtime',
        cacheTTL: 60 * 1000, // 1 minuto cache (evita llamadas repetidas si el estado no cambia)
      });

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ eventType: 'IN_GAME_ADVICE', data: res }));
      }
    } catch (err) {
      handleError(err, ws, 'LIVE_COACHING_UPDATE');
    }
  }
};

// Server main
wss.on('connection', (ws) => {
  console.log('[WS] Cliente conectado.');

  ws.on('message', async (rawMessage) => {
    let message;
    try {
      message = JSON.parse(rawMessage.toString());
      const { eventType } = message;
      if (!eventType) throw new Error("Mensaje sin 'eventType'");
      console.log('[WS] Mensaje recibido:', eventType);

      const handler = eventHandlers[eventType];
      if (typeof handler === 'function') {
        await handler(message, ws);
      } else {
        console.warn('[WS] Evento no reconocido:', eventType);
        ws.send(JSON.stringify({ eventType: 'ERROR', data: { message: 'Evento no reconocido' } }));
      }
    } catch (err) {
      handleError(err, ws, 'message');
    }
  });

  ws.on('close', () => console.log('[WS] Cliente desconectado.'));
  ws.on('error', (err) => handleError(err, ws, 'connection'));
});

console.log(`✅ WebSocket server iniciado en puerto ${SERVER_PORT}`);
