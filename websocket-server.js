// websocket-server.js - CORREGIDO PARA LA NUEVA FIRMA DE generateStrategicAnalysis

const WebSocket = require('ws');
const { generateStrategicAnalysis } = require('./dist/lib/ai/strategist');
const { createChampSelectPrompt, createLiveCoachingPrompt } = require('./dist/lib/ai/prompts');

const SERVER_PORT = process.env.PORT || process.env.WS_PORT || 8080;
const wss = new WebSocket.Server({ port: SERVER_PORT });

console.log(`✅ Servidor WebSocket de IA iniciado en el puerto ${SERVER_PORT}.`);

wss.on('connection', (ws) => {
    console.log('[CONEXIÓN] Nueva conexión de cliente (App Electron) establecida.');

    ws.on('message', async (rawMessage) => {
        try {
            const message = JSON.parse(rawMessage.toString());
            console.log('[MENSAJE RECIBIDO]', message);

            const { eventType, data, userData } = message;
            let prompt;
            let analysisResult;

            // --- LÓGICA DE DECISIÓN BASADA EN EL EVENTO ---
            switch (eventType) {
                case 'CHAMP_SELECT_UPDATE':
                    if (!data || !userData) throw new Error('Datos de Champ Select o de usuario incompletos.');
                    prompt = createChampSelectPrompt(data, userData);
                    
                    // CORRECCIÓN: Pasar el prompt directamente.
                    analysisResult = await generateStrategicAnalysis(prompt);

                    // Enviar la respuesta de vuelta
                    ws.send(JSON.stringify({ eventType: 'CHAMP_SELECT_ADVICE', data: analysisResult }));
                    break;
                
                case 'IN_GAME_SCREENSHOT_ANALYSIS': // Para la "R Definitiva" de Nano Banana
                    if (!data || !userData) throw new Error('Datos de captura de pantalla o de usuario incompletos.');
                    
                    prompt = createLiveCoachingPrompt(data, userData.zodiacSign);
                    
                    // CORRECCIÓN: Pasar el prompt directamente.
                    analysisResult = await generateStrategicAnalysis(prompt);
                    
                    // Enviar la respuesta de vuelta
                    ws.send(JSON.stringify({ eventType: 'IN_GAME_ADVICE', data: analysisResult }));
                    break;

                default:
                    console.warn(`[EVENTO] Tipo de evento no reconocido: ${eventType}`);
                    ws.send(JSON.stringify({ eventType: 'ERROR', data: { message: 'Tipo de evento no reconocido.' } }));
                    break;
            }

        } catch (error) {
            console.error('🚨 Error al procesar el mensaje del WebSocket:', error);
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