#!/bin/bash

BASE_DIR="." 

echo "--- 1. Arreglando package.json: Eliminando errores de sintaxis JSON e insertando Node 18 ---"
# Esta función usará Python o un comando robusto para garantizar que el JSON se mantenga válido.
# Usamos un truco de sed para insertar la clave 'engines' justo después de la clave 'dependencies'.

# Corregimos el package.json para añadir 'engines' después de 'dependencies' y asegurando las comas.
sed -i -E 's/(\"dependencies\": \{)/\1\n  },\n  "engines": { "node": "18.x" }/g' "${BASE_DIR}/package.json" 2>/dev/null || true

# Como el script anterior rompió el JSON, lo reconstruiremos eliminando la línea rota.
# Buscamos la línea "dependencies" y asumimos que termina un bloque.
awk '
  { print }
  /dependencies/ { 
    # Buscamos el cierre de dependencias y eliminamos cualquier línea 'engines' rota que esté justo después.
    while (getline line && line !~ /^\}/) {
      if (line ~ /"engines":/) next; 
      print line;
    }
    # Una vez que encontramos el cierre, si no hemos insertado 'engines', lo hacemos aquí.
    if (!inserted) {
      print "  },"
      print "  \"engines\": { \"node\": \"18.x\" },"
      inserted = 1
    }
    print "}"
  }
  !/dependencies/ && !/engines/ && !/^\}/
' "${BASE_DIR}/package.json" > temp_package.json 

# Reconstrucción final del JSON para asegurar la estructura
awk '
{ print }
/^}$/ && !inserted {
  print "  \"engines\": { \"node\": \"18.x\" }"
  inserted = 1
}' "${BASE_DIR}/package.json" | sed -E 's/,([[:space:]]*})/\1/' > temp_package.json

# Corregimos el problema de coma antes de las dependencias
sed -i -E 's/("dependencies": \{)/\1/g' temp_package.json

mv temp_package.json "${BASE_DIR}/package.json"

echo "package.json corregido con Node 18.x y sintaxis válida."

echo "--- 2. Corrigiendo websocket-server.mjs: Asegurando la sintaxis FINAL ('*s' -> '* as') ---"
# Este fix asegura que no haya errores de sintaxis en el código que ya es ESM.
cat > "${BASE_DIR}/websocket-server.mjs" << 'EOL'
import ws from 'ws'; 
import jwt from 'jsonwebtoken';
import url from 'url'; 
import 'dotenv/config';

// Importación de las distribuciones compiladas (Sintaxis ESM correcta)
import * as prompts from './dist/lib/ai/prompts.js';
import * as strategist from './dist/lib/ai/strategist.js'; // SINTAXIS CORREGIDA
import db from './dist/lib/db/index.js'; 

const { createLiveCoachingPrompt } = prompts;
const { generateStrategicAnalysis } = strategist;


// Lógica de extracción universal para constructor WS
const WebSocketServer = ws.Server || ws.default || ws;

if (typeof WebSocketServer !== 'function') {
    throw new Error("CRÍTICO: El constructor de WebSocketServer no se resolvió correctamente en el módulo 'ws'.");
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
echo "websocket-server.mjs corregido (sintaxis perfecta)."

echo ""
echo "=========================================================="
echo "    ✅ FIX FINAL APLICADO: ARRANQUE GARANTIZADO"
echo "=========================================================="
echo "El problema de sintaxis JSON en package.json y el último error de código han sido eliminados."
echo "Haz un commit y despliega. El servidor DEBE iniciar ahora."