// websocket-server.js - VERSIÓN CON LÓGICA DE HORÓSCOPO Y DATOS DE BD

const WebSocket = require('ws');
const path = require('path');
const axios = require('axios'); // Necesitamos axios para buscar el horóscopo

require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

// Importaciones desde 'dist'
const { generateStrategicAnalysis } = require('./dist/lib/ai/strategist');
const { createChampSelectPrompt, createLiveCoachingPrompt, createPreGamePrompt } = require('./dist/lib/ai/prompts');
const { getSql } = require('./dist/lib/db'); // Importamos el conector de la base de datos

const SERVER_PORT = process.env.WS_PORT || 8080;
const wss = new WebSocket.Server({ port: SERVER_PORT });

// --- Helper para buscar el horóscopo ---
async function getDailyHoroscope(zodiacSign) {
    try {
        // Usamos una API simple de horóscopos o un scraper. Aquí simulamos con una búsqueda.
        // En un entorno de producción real, usarías una API de horóscopos confiable.
        console.log(`[HOROSCOPE] Buscando horóscopo para ${zodiacSign}...`);
        // Esta es una simulación. Reemplazar con una llamada a una API real si es posible.
        const response = await axios.get(`https://www.google.com/search?q=horoscopo+de+hoy+para+${zodiacSign}`);
        // Lógica simple para extraer un fragmento del HTML (esto es frágil y solo para demostración)
        const snippet = response.data.split('meta name="description" content="')[1].split('"')[0];
        console.log(`[HOROSCOPE] Snippet encontrado: "${snippet}"`);
        return snippet || "Enfoca tu energía en la comunicación y la paciencia."; // Fallback
    } catch (error) {
        console.error('[HOROSCOPE] Error al buscar el horóscopo:', error.message);
        return "Concéntrate en tus fortalezas y juega con confianza."; // Fallback en caso de error
    }
}

const validate = (schema, data) => { /* ... (sin cambios) ... */ };
const handleError = (error, ws, context = 'general') => { /* ... (sin cambios) ... */ };

// --- MANEJADOR DE EVENTOS CON NUEVA LÓGICA ---
const eventHandlers = {
  'QUEUE_UPDATE': async ({ userData }, ws) => {
    validate('userData', userData);
    console.log('[EVENTO] Procesando QUEUE_UPDATE para consejo astro-técnico...');
    
    // 1. OBTENER DATOS ADICIONALES
    const dailyHoroscope = await getDailyHoroscope(userData.zodiacSign);
    
    // 2. OBTENER DATOS DE LA BASE DE DATOS (Simulación de puntos a mejorar)
    // En un sistema real, aquí harías una consulta a tu tabla de análisis de partidas.
    const performanceData = {
        weakness1: "Control de oleadas en el juego temprano.",
        weakness2: "Posicionamiento en peleas de equipo tardías."
    };

    // 3. CREAR EL PROMPT CON TODOS LOS DATOS
    const prompt = createPreGamePrompt(userData, dailyHoroscope, performanceData);
    
    // 4. LLAMAR A LA IA
    const model = 'gemini-2.0-flash';
    const analysisResult = await generateStrategicAnalysis(prompt, 'object', model);
    
    console.log('[EVENTO] ✅ Consejo astro-técnico generado. Enviando QUEUE_ADVICE...');
    ws.send(JSON.stringify({ eventType: 'QUEUE_ADVICE', data: analysisResult }));
  },

  'CHAMP_SELECT_UPDATE': async ({ data, userData }, ws) => {
    // ... (sin cambios)
    validate('userData', userData);
    console.log('[EVENTO] Procesando CHAMP_SELECT_UPDATE para analizar el draft...');
    const model = 'gemini-2.0-flash';
    const prompt = createChampSelectPrompt(data, userData);
    const analysisResult = await generateStrategicAnalysis(prompt, 'object', model);
    console.log('[EVENTO] ✅ Análisis de draft generado. Enviando CHAMP_SELECT_ADVICE...');
    ws.send(JSON.stringify({ eventType: 'CHAMP_SELECT_ADVICE', data: analysisResult }));
  },

  'IN_GAME_SCREENSHOT_ANALYSIS': async ({ data, userData }, ws) => {
    // ... (sin cambios)
    validate('userData', userData);
    console.log('[EVENTO] Procesando IN_GAME_SCREENSHOT_ANALYSIS para coaching en vivo...');
    const model = 'gemini-2.0-flash';
    const prompt = createLiveCoachingPrompt(data, userData.zodiacSign);
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