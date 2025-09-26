const WebSocket = require('ws');
const url = require('url');
const { Pool } = require('pg');
require('dotenv').config();

// Imports de la distribución compilada (CJS)
const prompts = require('./dist/lib/ai/prompts');
const strategist = require('./dist/lib/ai/strategist');
const db = require('./dist/lib/db/index.js'); 

const { createLiveCoachingPrompt } = prompts;
const { generateStrategicAnalysis } = strategist;


const port = process.env.PORT || 8080;

const pool = db.pool;

const wss = new WebSocket.Server({ port }); 
const clients = new Map();

console.log(`✅ Servidor WebSocket de Producción iniciado en el puerto ${port}.`);

const fetchUserData = async (userId) => {
  try {
    const res = await pool.query('SELECT id, username, zodiac_sign, live_game_data, subscription_tier FROM users WHERE id = $1', [userId]);
    return res.rows[0];
  } catch (error) {
    console.error(`Error al buscar usuario ${userId} en la DB:`, error);
    return null;
  }
};

wss.on('connection', (ws, req) => {
  // --- FIX: AUTENTICACIÓN DESACTIVADA PARA PRUEBAS ---
  ws.userId = 1; 
  clients.set(ws, { id: 1 });
  // ----------------------------------------------------

  console.log(`[CONEXIÓN] Usuario SIMULADO (ID 1) conectado. Clientes activos: ${clients.size}`);
  
  ws.send(JSON.stringify({ realtimeAdvice: 'Conectado al Coach MetaMind. Esperando inicio de partida.', priorityAction: 'STATUS' }));

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[DESCONEXIÓN] Usuario ${ws.userId} desconectado. Clientes activos: ${clients.size}`);
  });
});


// --- EL MOTOR DE COACHING DE ÉLITE EN TIEMPO REAL (LÓGICA DE PRUEBA) ---
setInterval(async () => {
  if (clients.size === 0) return;

  for (const [ws, clientData] of clients.entries()) {
    if (ws.readyState !== 1 /* OPEN */) continue; 

    // Usamos el ID 1 fijo
    const freshUserData = await fetchUserData(1); 
    
    if (freshUserData && freshUserData.live_game_data) {
        
        const liveGameData = freshUserData.live_game_data;
        
        try {
            const analysisResult = await generateStrategicAnalysis({ 
                liveGameData: liveGameData, 
                zodiacSign: freshUserData.zodiac_sign || 'Aries' 
            });
            
            const messageObject = {
                realtimeAdvice: analysisResult.realtimeAdvice || analysisResult.message, 
                priorityAction: analysisResult.priorityAction || 'ANALYSIS',
                gameTime: liveGameData.gameTime 
            };
            
            ws.send(JSON.stringify({ realtimeAdvice: messageObject.realtimeAdvice, priorityAction: messageObject.priorityAction }));
            
        } catch (error) {
            console.error(`Error al generar o enviar consejo SIMULADO para ${freshUserData.username}:`, error);
            ws.send(JSON.stringify({ realtimeAdvice: "ERROR CRÍTICO: Fallo en el análisis de IA simulado.", priorityAction: 'ERROR' }));
        }
        
    } else {
        ws.send(JSON.stringify({ realtimeAdvice: 'Coach activo. Inicia el polling de datos desde el cliente Electron.', priorityAction: 'STATUS' }));
    }
  }
}, 10000);