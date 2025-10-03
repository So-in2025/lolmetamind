// websocket-server.js - VERSIÓN FINAL, PROFESIONAL Y COMPLETA

const WebSocket = require('ws');
const path = require('path');

// Carga de variables de entorno de forma segura, apuntando a la raíz del proyecto.
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

// Importaciones de lógica de negocio desde la carpeta de compilación 'dist'.
const { generateStrategicAnalysis } = require('./dist/lib/ai/strategist');
const { createChampSelectPrompt, createLiveCoachingPrompt, createPreGamePrompt } = require('./dist/lib/ai/prompts');

const SERVER_PORT = process.env.WS_PORT || 8080;
const wss = new WebSocket.Server({ port: SERVER_PORT });

// --- MEJORA 2: VALIDACIÓN DE DATOS (EJEMPLO SIMPLE) ---
// En un proyecto real, se usaría una librería como Zod para esquemas más complejos.
const validate = (schema, data) => {
  if (!data) {
    throw new Error(`Datos requeridos por el esquema '${schema}' están ausentes.`);
  }
  if (schema === 'userData' && (typeof data.summonerName !== 'string' || !data.zodiacSign)) {
    throw new Error('El objeto userData no tiene el formato esperado (requiere summonerName y zodiacSign).');
  }
  // Se podrían añadir más validaciones para 'draftData', 'screenshotData', etc.
  return true;
};

// --- MEJORA 3: MANEJADOR DE ERRORES CENTRALIZADO ---
const handleError = (error, ws, context = 'general') => {
  const errorMessage = error instanceof Error ? error.message : 'Un error desconocido ocurrió.';
  console.error(`🚨 Error en [${context}]:`, errorMessage);
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ eventType: 'ERROR', data: { message: `Error en el servidor: ${errorMessage}` } }));
  }
};

// --- MEJORA 1: MANEJADOR DE EVENTOS (HANDLER PATTERN) ---
const eventHandlers = {
  /**
   * Maneja la solicitud de consejo pre-partida.
   */
  'QUEUE_UPDATE': async ({ userData }, ws) => {
    validate('userData', userData);
    console.log('[EVENTO] Procesando QUEUE_UPDATE para generar consejo pre-partida...');
    const prompt = createPreGamePrompt(userData);
    const analysisResult = await generateStrategicAnalysis(prompt);
    console.log('[EVENTO] ✅ Consejo pre-partida generado. Enviando QUEUE_ADVICE...');
    ws.send(JSON.stringify({ eventType: 'QUEUE_ADVICE', data: analysisResult }));
  },

  /**
   * Maneja el análisis del draft en selección de campeón.
   */
  'CHAMP_SELECT_UPDATE': async ({ data, userData }, ws) => {
    validate('userData', userData);
    // validate('draftData', data); // Aquí se implementaría una validación para 'data'
    console.log('[EVENTO] Procesando CHAMP_SELECT_UPDATE para analizar el draft...');
    const prompt = createChampSelectPrompt(data, userData);
    const analysisResult = await generateStrategicAnalysis(prompt);
    console.log('[EVENTO] ✅ Análisis de draft generado. Enviando CHAMP_SELECT_ADVICE...');
    ws.send(JSON.stringify({ eventType: 'CHAMP_SELECT_ADVICE', data: analysisResult }));
  },

  /**
   * Maneja el análisis de capturas de pantalla para coaching en vivo.
   */
  'IN_GAME_SCREENSHOT_ANALYSIS': async ({ data, userData }, ws) => {
    validate('userData', userData);
    // validate('screenshotData', data); // Aquí se implementaría una validación para 'data'
    console.log('[EVENTO] Procesando IN_GAME_SCREENSHOT_ANALYSIS para coaching en vivo...');
    const prompt = createLiveCoachingPrompt(data, userData.zodiacSign);
    const analysisResult = await generateStrategicAnalysis(prompt);
    console.log('[EVENTO] ✅ Consejo en vivo generado. Enviando IN_GAME_ADVICE...');
    ws.send(JSON.stringify({ eventType: 'IN_GAME_ADVICE', data: analysisResult }));
  }
};

// --- LÓGICA PRINCIPAL DEL SERVIDOR ---
wss.on('connection', (ws) => {
  console.log('[CONEXIÓN] Nueva conexión de cliente (App Electron) establecida.');

  ws.on('message', async (rawMessage) => {
    let message;
    try {
      message = JSON.parse(rawMessage.toString());
      const { eventType } = message;

      if (!eventType) {
        throw new Error("El mensaje recibido no contiene 'eventType'.");
      }
      
      console.log('[MENSAJE RECIBIDO]', eventType);

      // Busca el manejador correspondiente al tipo de evento.
      const handler = eventHandlers[eventType];

      if (handler) {
        // Si se encuentra, lo ejecuta pasándole los datos y la conexión.
        await handler(message, ws);
      } else {
        console.warn(`[EVENTO] Tipo de evento no reconocido: ${eventType}`);
        ws.send(JSON.stringify({ eventType: 'ERROR', data: { message: 'Tipo de evento no reconocido.' } }));
      }
    } catch (error) {
      // Cualquier error (de parseo, validación o ejecución) es capturado aquí.
      handleError(error, ws, message ? message.eventType : 'parsing');
    }
  });

  ws.on('close', () => {
    console.log('[DESCONEXIÓN] Conexión de cliente (App Electron) cerrada.');
  });
  
  ws.on('error', (err) => {
    // Este evento captura errores a nivel de la conexión WebSocket en sí.
    handleError(err, ws, 'connection');
  });
});

console.log(`✅ Servidor WebSocket de IA iniciado en el puerto ${SERVER_PORT}.`);