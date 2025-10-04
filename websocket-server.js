// websocket-server.js - VERSIÓN FINAL ROBUSTA CON LÓGICA ASTRO-TÉCNICA INTERNA

const WebSocket = require('ws');
const path = require('path');
// Se elimina la dependencia de axios para scraping aquí

require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

// Importaciones de lógica de negocio desde la carpeta de compilación 'dist'.
const { generateStrategicAnalysis } = require('./dist/lib/ai/strategist');
const { createChampSelectPrompt, createLiveCoachingPrompt, createPreGamePrompt } = require('./dist/lib/ai/prompts');

const SERVER_PORT = process.env.WS_PORT || 8080;
const wss = new WebSocket.Server({ port: SERVER_PORT });

// --- VALIDACIÓN Y MANEJO DE ERRORES (sin cambios) ---
const validate = (schema, data) => {
  if (!data) {
    throw new Error(`Datos requeridos por el esquema '${schema}' están ausentes.`);
  }
  if (schema === 'userData' && (typeof data.summonerName !== 'string' || !data.zodiacSign)) {
    throw new Error('El objeto userData no tiene el formato esperado (requiere summonerName y zodiacSign).');
  }
  return true;
};

const handleError = (error, ws, context = 'general') => {
  const errorMessage = error instanceof Error ? error.message : 'Un error desconocido ocurrió.';
  console.error(`🚨 Error en [${context}]:`, errorMessage);
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ eventType: 'ERROR', data: { message: `Error en el servidor: ${errorMessage}` } }));
  }
};

// --- MANEJADOR DE EVENTOS (CON LÓGICA ASTRO-TÉCNICA DIRECTA) ---
const eventHandlers = {
  /**
   * Maneja la solicitud de consejo pre-partida (ASTRO-TÉCNICO).
   * La IA genera el horóscopo internamente.
   */
  'QUEUE_UPDATE': async ({ userData }, ws) => {
    validate('userData', userData);
    console.log('[EVENTO] Procesando QUEUE_UPDATE para consejo astro-técnico...');
    
    // 1. OBTENER DATOS DE LA BASE DE DATOS (Simulación de puntos a mejorar)
    // En un sistema real, harías una consulta a la DB aquí, p. ej.:
    // const performanceData = await getSql()('SELECT weakness1, weakness2 FROM user_performance WHERE user_id = $1', [userData.id]);
    const performanceData = {
        weakness1: "Control de oleadas en el juego temprano.",
        weakness2: "Posicionamiento en peleas de equipo tardías."
    };

    // 2. CREAR EL PROMPT CON LOS DATOS (El prompt instruye a la IA a generar el horóscopo)
    // Se pasa la data de rendimiento, la IA se encarga del horóscopo
    const prompt = createPreGamePrompt(userData, performanceData);
    
    // 3. LLAMAR A LA IA (CON CONTRATO DETERMINISTA)
    const model = 'gemini-2.0-flash'; // Modelo ultrarrápido para baja latencia
    const analysisResult = await generateStrategicAnalysis(prompt, 'object', model);
    
    console.log('[EVENTO] ✅ Consejo astro-técnico generado. Enviando QUEUE_ADVICE...');
    ws.send(JSON.stringify({ eventType: 'QUEUE_ADVICE', data: analysisResult }));
  },

  /**
   * Maneja el análisis del draft en selección de campeón.
   */
  'CHAMP_SELECT_UPDATE': async ({ data, userData }, ws) => {
    validate('userData', userData);
    console.log('[EVENTO] Procesando CHAMP_SELECT_UPDATE para analizar el draft...');
    
    const model = 'gemini-2.0-flash'; // Modelo ultrarrápido para baja latencia
    const prompt = createChampSelectPrompt(data, userData);
    
    // CÓDIGO DETERMINISTA: Espera un 'object'
    const analysisResult = await generateStrategicAnalysis(prompt, 'object', model);
    
    console.log('[EVENTO] ✅ Análisis de draft generado. Enviando CHAMP_SELECT_ADVICE...');
    ws.send(JSON.stringify({ eventType: 'CHAMP_SELECT_ADVICE', data: analysisResult }));
  },

   /**
   * Maneja el análisis de datos en vivo (Ahora con nombre limpio).
   */
  'LIVE_COACHING_UPDATE': async ({ data, userData }, ws) => { // NOMBRE CORREGIDO
    validate('userData', userData);
    
    // CRÍTICO: El payload debe contener la clave 'liveGameData'
    if (!data.liveGameData) {
        console.error('[EVENTO] Datos de juego en vivo faltantes. Abortando solicitud de IA.');
        return; 
    }
    
    console.log('[EVENTO] Procesando LIVE_COACHING_UPDATE para coaching en vivo...');
    
    const model = 'gemini-2.0-flash';
    // Se extrae la data del juego en vivo del objeto 'data'
    const prompt = createLiveCoachingPrompt(data.liveGameData, userData.zodiacSign);
    
    const analysisResult = await generateStrategicAnalysis(prompt, 'object', model);
    
    console.log('[EVENTO] ✅ Consejo en vivo generado. Enviando IN_GAME_ADVICE...');
    ws.send(JSON.stringify({ eventType: 'IN_GAME_ADVICE', data: analysisResult }));
  }
};

// --- LÓGICA PRINCIPAL DEL SERVIDOR (sin cambios) ---
wss.on('connection', (ws) => {
  console.log('[CONEXIÓN] Nueva conexión de cliente (App Electron) establecida.');

  ws.on('message', async (rawMessage) => {
    let message;
    try {
      message = JSON.parse(rawMessage.toString());
      const { eventType } = message;
      if (!eventType) throw new Error("Mensaje sin 'eventType'.");
      console.log('[MENSAJE RECIBIDO]', eventType);

      const handler = eventHandlers[eventType];
      if (handler) {
        await handler(message, ws);
      } else {
        console.warn(`[EVENTO] No reconocido: ${eventType}`);
        ws.send(JSON.stringify({ eventType: 'ERROR', data: { message: 'Evento no reconocido.' } }));
      }
    } catch (error) {
      handleError(error, ws, message ? message.eventType : 'parsing');
    }
  });

  ws.on('close', () => console.log('[DESCONEXIÓN] Cliente cerrado.'));
  ws.on('error', (err) => handleError(err, ws, 'connection'));
});

console.log(`✅ Servidor WebSocket de IA iniciado en el puerto ${SERVER_PORT}.`);
