const WebSocket = require('ws');
const url = require('url');
const { Pool } = require('pg');
require('dotenv').config();
const jwt = require('jsonwebtoken'); 

// Imports de la distribución compilada (CJS)
const prompts = require('./dist/lib/ai/prompts');
const strategist = require('./dist/lib/ai/strategist');
const db = require('./dist/lib/db/index.js'); 

const { createLiveCoachingPrompt } = prompts;
const { generateStrategicAnalysis } = strategist;


const JWT_SECRET = process.env.JWT_SECRET; 
const SERVER_PORT = process.env.PORT || process.env.WS_PORT || 8080; 

const pool = db.pool;

const wss = new WebSocket.Server({ port: SERVER_PORT }); 
const clients = new Map();

console.log(`✅ Servidor WebSocket de Producción iniciado en el puerto ${SERVER_PORT}.`);

const fetchUserData = async (userId) => {
  try {
    // FIX 1: Alias para plan_status -> subscription_tier
    // FIX 2: Usar COALESCE para dar un valor por defecto al signo zodiacal
    const res = await pool.query('SELECT id, username, COALESCE(zodiac_sign, \'Aries\') as zodiac_sign, live_game_data, plan_status AS subscription_tier FROM users WHERE id = $1', [userId]);
    return res.rows[0];
  } catch (error) {
    console.error(`Error al buscar usuario ${userId} en la DB:`, error);
    // Si la conexión falla, intentamos devolver un objeto mínimo para evitar un crash.
    return { subscription_tier: 'FREE' };
  }
};

wss.on('connection', (ws, req) => {
// ... (omitted connection logic, no changes here)
  const parameters = url.parse(req.url, true).query;
  const token = parameters.token;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    ws.userId = decoded.userId;
    clients.set(ws, { id: decoded.userId }); 
    console.log(`[CONEXIÓN] Usuario ${decoded.userId} conectado. Clientes activos: ${clients.size}`);
    
    ws.send(JSON.stringify({ realtimeAdvice: 'Conectado al Coach MetaMind. Esperando inicio de partida.', priorityAction: 'STATUS' }));

  } catch (err) {
    console.log('[ERROR] Conexión rechazada: Token JWT inválido.', err.message);
    ws.close(1008, 'Token JWT inválido');
    return;
  }

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[DESCONEXIÓN] Usuario ${ws.userId} desconectado. Clientes activos: ${clients.size}`);
  });
});


// --- EL MOTOR DE COACHING DE ÉLITE EN TIEMPO REAL ---
setInterval(async () => {
  if (clients.size === 0) return;

  for (const [ws, clientData] of clients.entries()) {
    if (ws.readyState !== 1 /* OPEN */) continue; 

    // Usamos clientData.id, que ahora proviene del JWT
    const freshUserData = await fetchUserData(clientData.id); 
    
    if (freshUserData && freshUserData.live_game_data) {
        
        const liveGameData = freshUserData.live_game_data;
        
        try {
            const analysisResult = await generateStrategicAnalysis({ 
                liveGameData: liveGameData, 
                // El valor de freshUserData.zodiac_sign ahora es 'Aries' si era nulo
                zodiacSign: freshUserData.zodiac_sign
            });
            
            const messageObject = {
                realtimeAdvice: analysisResult.realtimeAdvice || analysisResult.message, 
                priorityAction: analysisResult.priorityAction || 'ANALYSIS',
                gameTime: liveGameData.gameTime 
            };
            
            ws.send(JSON.stringify({ realtimeAdvice: messageObject.realtimeAdvice, priorityAction: messageObject.priorityAction }));
            
        } catch (error) {
            console.error(`Error al generar o enviar consejo ÉLITE para ${freshUserData.username}:`, error);
            // El fallback de error ahora está estructurado, resolviendo potencialmente el 'undefined'
            ws.send(JSON.stringify({ realtimeAdvice: "ERROR CRÍTICO: El análisis de IA falló.", priorityAction: 'ERROR' }));
        }
        
    } else {
        const statusMessage = freshUserData && (freshUserData.subscription_tier !== 'PREMIUM' && freshUserData.subscription_tier !== 'TRIAL')
          ? 'Acceso limitado. Coach en tiempo real es Premium/Trial.'
          : 'Coach inactivo. Inicia una partida con la App de escritorio.'; 

        ws.send(JSON.stringify({ realtimeAdvice: statusMessage, priorityAction: 'STATUS' }));
    }
  }
}, 10000);