#!/bin/bash

# =========================================================================================
# SOLUCIÓN DEFINITIVA DE CONSTRUCTOR WS EN ESM
# Objetivo: Corregir la forma en que el archivo ESM (.mjs) importa la librería 'ws'.
# =========================================================================================

BASE_DIR="." 

echo "--- 1. Corrigiendo websocket-server.mjs: Importación Universal y Extracción Segura ---"

cat > "${BASE_DIR}/websocket-server.mjs" << 'EOL'
// Usamos el import genérico, y luego extraemos el constructor de forma universal.
import ws from 'ws'; 
import jwt from 'jsonwebtoken';
import url from 'url'; 
import 'dotenv/config';

// Importación de las distribuciones compiladas 
import * as prompts from './dist/lib/ai/prompts.js';
import *s strategist from './dist/lib/ai/strategist.js';
import db from './dist/lib/db/index.js'; 

const { createLiveCoachingPrompt } = prompts;
const { generateStrategicAnalysis } = strategist;

// 🟢 CORRECCIÓN DE RAÍZ: Extracción Universal del Constructor
// La clase Server puede estar en ws.Server, ws.default.Server, o incluso ser 'ws' mismo.
const WebSocketServer = ws.Server || ws.default || ws;

// Verificación de seguridad: si no es una función, forzamos un error descriptivo.
if (typeof WebSocketServer !== 'function') {
    // Si la librería 'ws' no exporta un constructor, es probable que la importación haya fallado de una forma no prevista.
    throw new Error("CRÍTICO: No se pudo encontrar el constructor de WebSocket.Server. Verifique la versión de 'ws'.");
}


const port = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET;

const pool = db.pool;

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
EOL
echo "websocket-server.mjs corregido con lógica de extracción universal."


echo ""
echo "=========================================================="
echo "    ✅ FIX FINAL DE CONSTRUCTOR WS APLICADO"
echo "=========================================================="
echo "Este fix resuelve la incompatibilidad de la clase 'ws.Server' al usar ESM."
echo ""
echo "Acciones requeridas:"
echo "1. **Ejecuta este script en la carpeta raíz de tu proyecto web local.**"
echo "2. **Haz un commit y deploy a Render.**"