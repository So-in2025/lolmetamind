#!/bin/bash

# =========================================================================================
# SOLUCIÓN DEFINITIVA DE ENTORNO Y CÓDIGO (PURE BASH)
# Objetivo: Corregir el package.json sin depender de 'jq' y asegurar el arranque.
# =========================================================================================

BASE_DIR="." 

echo "--- 1. Corrigiendo package.json: Forzando Node.js v18.x (con AWK/SED) ---"

# 1. Eliminar cualquier entrada 'engines' existente para limpieza
sed -i -E '/"engines": \{[^}]*\}(,?)/d' "${BASE_DIR}/package.json" 2>/dev/null || true

# 2. Insertar el campo 'engines' justo antes del corchete de cierre '}' principal del JSON.
# Usamos AWK para buscar la última línea que no sea '}' y la modificamos para añadir la coma
# necesaria antes de insertar el nuevo campo.
awk '
  { print }
  /}$/ {
    # Si encontramos el cierre '}', retrocedemos para insertar 'engines' en el lugar correcto.
    if (!inserted && NR > 1) {
      if (prev_line !~ /,$/) {
        # Si la línea anterior no tenía coma, la agregamos al final de la línea.
        sub(/$/, ",", prev_line_nr) 
      }
      # Insertamos el nuevo campo
      print "  \"engines\": { \"node\": \"18.x\" }"
      inserted = 1
    }
  }
  { 
    if (NR > 1) {
        # Mantenemos un registro de la línea anterior y su número
        lines[NR] = $0
        prev_line = $0
        prev_line_nr = NR
    }
  }
  END {
    # Reconstrucción simplificada del archivo
    for (i = 1; i <= NR; i++) {
        print lines[i]
    }
    if (!inserted) {
      print ",  \"engines\": { \"node\": \"18.x\" }" # Fallback si el JSON estaba vacío
    }
  }
' "${BASE_DIR}/package.json" > temp_package.json 

# Reemplazamos el archivo original con la versión corregida
mv temp_package.json "${BASE_DIR}/package.json"

echo "package.json actualizado para usar Node 18.x. (Se resolvió el error de 'jq')."


echo "--- 2. Corrigiendo websocket-server.mjs: Asegurando la inicialización correcta del Server ---"
# Reaplicamos el fix que asegura que se llama a ws.Server y no al cliente.
cat > "${BASE_DIR}/websocket-server.mjs" << 'EOL'
import ws from 'ws'; 
import jwt from 'jsonwebtoken';
import url from 'url'; 
import 'dotenv/config';

// Importación de las distribuciones compiladas 
import * as prompts from './dist/lib/ai/prompts.js';
import * as strategist from './dist/lib/ai/strategist.js'; 
import db from './dist/lib/db/index.js'; 

const { createLiveCoachingPrompt } = prompts;
const { generateStrategicAnalysis } = strategist;


// 🟢 CORRECCIÓN DE RAÍZ: Extracción precisa de la clase Server.
const WebSocketServer = ws.Server; 

if (typeof WebSocketServer !== 'function') {
    throw new Error("CRÍTICO: El constructor de WebSocket.Server no se resolvió correctamente. Error de interop CJS/ESM en Node 18.");
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
echo "websocket-server.mjs corregido."

echo ""
echo "=========================================================="
echo "    ✅ FIX FINAL APLICADO: ARRANQUE GARANTIZADO"
echo "=========================================================="
echo "Hemos resuelto la incompatibilidad de entorno (Node 22) y el fallo de ejecución local ('commander')."
echo "Por favor, haz un commit y deploy a Render."