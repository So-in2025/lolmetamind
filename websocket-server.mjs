import * as wsModule from 'ws'; // Importa el módulo completo
import jwt from 'jsonwebtoken';
import url from 'url'; 
import 'dotenv/config';

// Importación de las distribuciones compiladas 
import * as prompts from './dist/lib/ai/prompts.js';
import * as strategist from './dist/lib/ai/strategist.js';
import db from './dist/lib/db/index.js'; 

const { createLiveCoachingPrompt } = prompts;
const { generateStrategicAnalysis } = strategist;

// 🟢 CORRECCIÓN: Extraer la clase 'Server' del objeto importado (wsModule)
// El constructor de WebSocket se encuentra en wsModule.default.Server o directamente en wsModule.Server,
// dependiendo de la versión de Node y cómo Babel lo empaquetó. 
const WebSocketServer = wsModule.Server || (wsModule.default ? wsModule.default.Server : null);

if (!WebSocketServer) {
    throw new Error("CRÍTICO: No se pudo encontrar el constructor de WebSocket.Server en el módulo 'ws'.");
}


const port = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET;

const pool = db.pool;

// Usamos el constructor extraído correctamente
const wss = new WebSocketServer({ port }); 
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
  const parameters = url.parse(req.url, true).query;
  const token = parameters.token;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    ws.userId = decoded.userId;
    clients.set(ws, { id: decoded.userId });
    console.log(`[CONEXIÓN] Usuario ${decoded.userId} conectado. Clientes activos: ${clients.size}`);
    
    // ws.send está aquí y está bien, pero falta 'ws.OPEN' en el intervalo.
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


// --- EL MOTOR DE COACHING DE ÉLITE EN TIEMPO REAL (BYPASS ACTIVO) ---
setInterval(async () => {
  if (clients.size === 0) return;

  for (const [ws, clientData] of clients.entries()) {
    // 🟢 CORRECCIÓN MENOR: ws.OPEN es una constante de la clase WebSocket.
    if (ws.readyState !== 1 /* OPEN */) continue; 

    const freshUserData = await fetchUserData(clientData.id); 
    
    // BYPASS PREMIUM
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
            console.error(`Error al generar o enviar consejo ÉLITE para ${freshUserData.username}:`, error);
            ws.send(JSON.stringify({ realtimeAdvice: "ERROR CRÍTICO: El enlace táctico con la IA se ha cortado. Concentración manual.", priorityAction: 'ERROR' }));
        }
        
    } else {
        const statusMessage = freshUserData && freshUserData.subscription_tier !== 'PREMIUM'
          ? 'Acceso limitado. Coach en tiempo real es Premium.'
          : 'Coach inactivo. Inicia una partida con la App de escritorio.'; 

        ws.send(JSON.stringify({ realtimeAdvice: statusMessage, priorityAction: 'STATUS' }));
    }
  }
}, 10000); 
