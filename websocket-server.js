// websocket-server.js - VERSIÓN CORREGIDA Y FINAL

const WebSocket = require('ws');
const path = require('path'); // <-- Se necesita para resolver la ruta
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') }); // <-- CORRECCIÓN DEFINITIVA
const { generateStrategicAnalysis } = require('./dist/lib/ai/strategist');
const { createChampSelectPrompt, createLiveCoachingPrompt, createPreGamePrompt } = require('./dist/lib/ai/prompts');

const SERVER_PORT = process.env.PORT || process.env.WS_PORT || 8080;
const wss = new WebSocket.Server({ port: SERVER_PORT });

console.log(`✅ Servidor WebSocket de IA iniciado en el puerto ${SERVER_PORT}.`);

wss.on('connection', (ws) => {
    console.log('[CONEXIÓN] Nueva conexión de cliente (App Electron) establecida.');

    ws.on('message', async (rawMessage) => {
        try {
            const message = JSON.parse(rawMessage.toString());
            console.log('[MENSAJE RECIBIDO]', message.eventType);

            const { eventType, data, userData } = message;
            let prompt;
            let analysisResult;

            // --- LÓGICA DE DECISIÓN BASADA EN EL EVENTO ---
            switch (eventType) {
                case 'QUEUE_UPDATE':
                    if (!userData) throw new Error('Datos de usuario incompletos para Queue Update.');
                    
                    console.log('[EVENTO] Procesando QUEUE_UPDATE para generar consejo pre-partida...');
                    prompt = createPreGamePrompt(userData);
                    analysisResult = await generateStrategicAnalysis(prompt);

                    console.log('[EVENTO] ✅ Consejo pre-partida generado. Enviando QUEUE_ADVICE...');
                    ws.send(JSON.stringify({ eventType: 'QUEUE_ADVICE', data: analysisResult }));
                    break;
                
                case 'CHAMP_SELECT_UPDATE':
                    if (!data || !userData) throw new Error('Datos de Champ Select o de usuario incompletos.');
                    
                    console.log('[EVENTO] Procesando CHAMP_SELECT_UPDATE para analizar el draft...');
                    prompt = createChampSelectPrompt(data, userData);
                    analysisResult = await generateStrategicAnalysis(prompt);

                    console.log('[EVENTO] ✅ Análisis de draft generado. Enviando CHAMP_SELECT_ADVICE...');
                    ws.send(JSON.stringify({ eventType: 'CHAMP_SELECT_ADVICE', data: analysisResult }));
                    break;
                
                case 'IN_GAME_SCREENSHOT_ANALYSIS':
                    if (!data || !userData) throw new Error('Datos de captura de pantalla o de usuario incompletos.');

                    console.log('[EVENTO] Procesando IN_GAME_SCREENSHOT_ANALYSIS para coaching en vivo...');
                    prompt = createLiveCoachingPrompt(data, userData.zodiacSign);
                    analysisResult = await generateStrategicAnalysis(prompt);
                    
                    console.log('[EVENTO] ✅ Consejo en vivo generado. Enviando IN_GAME_ADVICE...');
                    ws.send(JSON.stringify({ eventType: 'IN_GAME_ADVICE', data: analysisResult }));
                    break;

                default:
                    console.warn(`[EVENTO] Tipo de evento no reconocido: ${eventType}`);
                    ws.send(JSON.stringify({ eventType: 'ERROR', data: { message: 'Tipo de evento no reconocido.' } }));
                    break;
            }

        } catch (error) {
            console.error('🚨 Error al procesar el mensaje del WebSocket:', error.message);
            ws.send(JSON.stringify({ eventType: 'ERROR', data: { message: `Error en el servidor: ${error.message}` } }));
        }
    });

    ws.on('close', () => {
        console.log('[DESCONEXIÓN] Conexión de cliente (App Electron) cerrada.');
    });
    
    ws.on('error', (err) => {
        console.error('🚨 Error en la conexión WebSocket:', err);
    });
});