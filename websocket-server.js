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
// ID especial para usuarios que no han iniciado sesión (para evitar null)
const ANONYMOUS_USER_ID = 0; 

const pool = db.pool;

const wss = new WebSocket.Server({ port: SERVER_PORT }); 
const clients = new Map();

console.log(`✅ Servidor WebSocket de Producción iniciado en el puerto ${SERVER_PORT}.`);

const fetchUserData = async (userId) => {
  try {
    // Si es el ID anónimo, devolvemos un objeto base para evitar error SQL
    if (userId === ANONYMOUS_USER_ID) {
        return { 
            id: ANONYMOUS_USER_ID, 
            username: 'Anon', 
            zodiac_sign: 'Aries', 
            live_game_data: null, 
            subscription_tier: 'FREE' 
        };
    }
    
    // Consulta para usuarios logueados
    const res = await pool.query('SELECT id, username, COALESCE(zodiac_sign, \'Aries\') as zodiac_sign, live_game_data, plan_status AS subscription_tier FROM users WHERE id = $1', [userId]);
    return res.rows[0];
  } catch (error) {
    console.error(`Error al buscar usuario ${userId} en la DB:`, error);
    return null;
  }
};

wss.on('connection', (ws, req) => {
  const parameters = url.parse(req.url, true).query;
  const token = parameters.token;

  try {
    // 1. Verificar si se proporcionó un token y si es válido
    if (!token || token === 'null' || token === 'undefined') throw new Error('No token provided');
    
    const decoded = jwt.verify(token, JWT_SECRET);
    ws.userId = decoded.userId;
    clients.set(ws, { id: decoded.userId }); 
    console.log(`[CONEXIÓN] Usuario ${decoded.userId} conectado. Clientes activos: ${clients.size}`);
    
  } catch (err) {
    // 2. Si el token falla (porque no existe o es malformado), asignamos ID anónimo.
    ws.userId = ANONYMOUS_USER_ID;
    clients.set(ws, { id: ANONYMOUS_USER_ID });
    console.warn(`[CONEXIÓN] Usuario anónimo conectado. Razón: ${err.message}.`);
  }
  
  ws.send(JSON.stringify({ realtimeAdvice: 'Conectado al Coach MetaMind. Esperando inicio de partida.', priorityAction: 'STATUS' }));


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

    // Usamos clientData.id (real o anónimo)
    const freshUserData = await fetchUserData(clientData.id); 
    
    // Si la data del usuario es nula o si es el usuario anónimo (ID 0) y no hay liveGameData, envía estado.
    if (!freshUserData || freshUserData.id === ANONYMOUS_USER_ID || !freshUserData.live_game_data) {
        
        // El usuario anónimo solo recibe el mensaje de estado
        const statusMessage = freshUserData?.id === ANONYMOUS_USER_ID
          ? 'Conexión OK (Anónimo). Inicia sesión para guardar datos.'
          : 'Coach inactivo. Inicia una partida con la App de escritorio.';

        ws.send(JSON.stringify({ realtimeAdvice: statusMessage, priorityAction: 'STATUS' }));
        continue; // Saltar al siguiente cliente
    }

    // --- LÓGICA DE COACHING SOLO PARA USUARIOS AUTENTICADOS CON LIVE DATA ---
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
        console.error(`Error al generar o enviar consejo ÉLITE para ${freshUserData.username}:`, error);
        ws.send(JSON.stringify({ realtimeAdvice: "ERROR CRÍTICO: El análisis de IA falló.", priorityAction: 'ERROR' }));
    }
  }
}, 10000);