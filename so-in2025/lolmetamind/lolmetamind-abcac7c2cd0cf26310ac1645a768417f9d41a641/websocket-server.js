const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const url = require('url');
const { Pool } = require('pg');
require('dotenv').config();

// Imports de la distribución compilada
// Asegúrate de que prompts.js y strategist.js se transpilen antes de correr este server
const { createLiveCoachingPrompt } = require('./dist/lib/ai/prompts');
const { generateStrategicAnalysis } = require('./dist/lib/ai/strategist');

const port = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const wss = new WebSocket.Server({ port });
const clients = new Map();

console.log(`✅ Servidor WebSocket de Producción iniciado en el puerto ${port}.`);

// Función para obtener datos del usuario, incluyendo live_game_data y zodiacSign
const fetchUserData = async (userId) => {
  try {
    const res = await pool.query('SELECT id, username, summoner_id, region, zodiac_sign, live_game_data FROM users WHERE id = $1', [userId]);
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
    // Usamos el ID del usuario como clave
    ws.userId = decoded.userId;
    clients.set(ws, { id: decoded.userId });
    console.log(`[CONEXIÓN] Usuario ${decoded.userId} conectado. Clientes activos: ${clients.size}`);
    
    // Informar al cliente que la conexión fue exitosa
    ws.send(JSON.stringify({ status: 'connected', message: 'Conectado al Coach MetaMind. Esperando inicio de partida.' }));

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
// Verifica el estado del juego de los usuarios Premium cada 10 segundos
setInterval(async () => {
  if (clients.size === 0) return;

  for (const [ws, clientData] of clients.entries()) {
    if (ws.readyState !== WebSocket.OPEN) continue;

    // 1. OBTENER DATOS DE LA DB (live_game_data)
    const freshUserData = await fetchUserData(clientData.id); 
    
    // Debe existir liveGameData Y el usuario debe ser Premium
    if (freshUserData && freshUserData.live_game_data && freshUserData.subscription_tier === 'PREMIUM') {
        
        const liveGameData = freshUserData.live_game_data;
        
        try {
            // 2. GENERAR EL CONSEJO ELITE CON LA IA (usando el nuevo prompt)
            // Se usa liveGameData y zodiac_sign
            const analysisResult = await generateStrategicAnalysis({ 
                liveGameData: liveGameData, 
                zodiacSign: freshUserData.zodiac_sign 
            });
            
            // 3. ENVIAR EL CONSEJO ESTRUCTURADO Y TÁCTICO
            const messageObject = {
                // El error de la IA se manejará como un mensaje CRÍTICO, no genérico
                realtimeAdvice: analysisResult.realtimeAdvice, 
                priorityAction: analysisResult.priorityAction || 'ANALYSIS',
                gameTime: liveGameData.gameTime 
            };
            
            ws.send(JSON.stringify(messageObject));
            
        } catch (error) {
            console.error(`Error al generar o enviar consejo ÉLITE para ${freshUserData.username}:`, error);
            // En caso de fallo de IA, se envia el mensaje de error definido en strategist.js
            ws.send(JSON.stringify({ realtimeAdvice: "ERROR CRÍTICO: El enlace táctico con la IA se ha cortado. Concentración manual." }));
        }
        
    } else {
        // Si no hay datos de partida o el usuario no es Premium, enviar mensaje de estado
        const message = freshUserData && freshUserData.subscription_tier !== 'PREMIUM'
          ? 'Acceso limitado. Coach en tiempo real es Premium.'
          : 'Coach inactivo. Inicia una partida con la App de escritorio.';
          
        ws.send(JSON.stringify({ realtimeAdvice: message, priorityAction: 'STATUS' }));
    }
  }
}, 10000); // Revisa cada 10 segundos
