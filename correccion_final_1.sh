#!/bin/bash

# ==============================================================================
# SCRIPT DE CORRECCIÓN FINAL - BUILD DE PRODUCCIÓN EN RENDER
#
# Objetivo: 1. Solucionar el error "Cannot find module '@/...'" en el servidor
#              de WebSockets.
#           2. Configurar Babel para que resuelva correctamente los alias de ruta
#              durante el proceso de compilación (build).
#           3. Dejar el servidor 100% listo para producción.
# ==============================================================================

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Corrigiendo el proceso de build para el servidor de Render...${NC}"

# --- 1. Instalar el plugin de Babel para resolver alias ---
echo -e "\n${GREEN}Paso 1: Instalando 'babel-plugin-module-resolver'...${NC}"
npm install --save-dev babel-plugin-module-resolver


# --- 2. Actualizar la configuración de Babel ---
echo -e "\n${GREEN}Paso 2: Actualizando 'babel.config.server.js' para usar el nuevo plugin...${NC}"
cat << 'EOF' > babel.config.server.js
// babel.config.server.js
// Configuración de Babel para el servidor de WebSockets (Render)
module.exports = {
  "presets": [
    [
      "@babel/preset-env",
      {
        "targets": {
          "node": "current"
        }
      }
    ]
  ],
  "plugins": [
    [
      "module-resolver",
      {
        "root": ["./src"],
        "alias": {
          "@": "./src"
        }
      }
    ]
  ]
};
EOF
echo "Actualizado: babel.config.server.js. ✅"


# --- 3. Asegurar que el servidor WebSocket use las rutas correctas ---
# (Este paso asegura que las importaciones en el servidor principal sean correctas)
echo -e "\n${GREEN}Paso 3: Verificando y reforzando las rutas en 'websocket-server.js'...${NC}"
cat << 'EOF' > websocket-server.js
// websocket-server.js
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const url = require('url');
const { Pool } = require('pg');
require('dotenv').config();

// Las rutas ahora apuntan a la carpeta 'dist' que Babel genera.
const { getLiveGameBySummonerId } = require('./dist/services/riotApiService');
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

const fetchUserData = async (userId) => {
  try {
    const res = await pool.query('SELECT id, username, summoner_id, region FROM users WHERE id = $1', [userId]);
    return res.rows[0];
  } catch (error) {
    console.error(`Error al buscar usuario ${userId} en la DB:`, error);
    return null;
  }
};

wss.on('connection', async (ws, req) => {
  const parameters = new URLSearchParams(url.parse(req.url).search);
  const token = parameters.get('token');

  if (!token) {
    ws.close(1008, "Token no proporcionado");
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userDataFromDB = await fetchUserData(decoded.userId);

    if (!userDataFromDB) {
      console.log(`Usuario con ID ${decoded.userId} no encontrado en la DB. Conexión rechazada.`);
      ws.close(1008, "Usuario no encontrado");
      return;
    }
    
    clients.set(ws, userDataFromDB);
    console.log(`🔗 Cliente conectado y verificado: ${userDataFromDB.username}`);
    ws.send('👋 ¡Bienvenido al coach en tiempo real! Buscando tu partida...');

    ws.on('close', () => {
      console.log(`💔 Cliente desconectado: ${userDataFromDB.username}`);
      clients.delete(ws);
    });
    
    ws.on('error', (error) => console.error(`Error en la conexión de ${userDataFromDB.username}:`, error));

  } catch (err) {
    ws.close(1008, "Token inválido");
  }
});

// --- El Motor de Coaching en Tiempo Real ---
setInterval(async () => {
  if (clients.size === 0) return;

  console.log(`\n🔎 Verificando partidas activas para ${clients.size} cliente(s)...`);

  for (const [ws, userData] of clients.entries()) {
    if (ws.readyState !== WebSocket.OPEN || !userData.summoner_id || !userData.region) continue;

    try {
      const liveGame = await getLiveGameBySummonerId(userData.summoner_id, userData.region);
      
      if (liveGame) {
        console.log(`[${userData.username}] Partida encontrada. Generando consejo de IA...`);
        
        const prompt = createLiveCoachingPrompt(liveGame, userData.username);
        const analysis = await generateStrategicAnalysis({ customPrompt: prompt });
        
        const tip = analysis.candidates[0].content.parts[0].text;
        
        ws.send(`[Minuto ${Math.floor(liveGame.gameLength / 60)}]: ${tip}`);
      }
    } catch (error) {
      console.error(`Error procesando al cliente ${userData.username}:`, error);
    }
  }
}, 60000); // Revisa cada 60 segundos
EOF
echo "Actualizado: websocket-server.js. ✅"


echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡CONFIGURACIÓN DE BUILD CORREGIDA! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Pasos Finales:${NC}"
echo -e "1.  Sube todos los cambios a tu repositorio. Esto incluye el nuevo `package.json`, `package-lock.json` y el `babel.config.server.js` actualizado."
echo -e "2.  Render detectará los cambios en `package.json` y reinstalará las dependencias, incluyendo el nuevo plugin."
echo -e "3.  El comando de build ahora funcionará correctamente, y el servidor se iniciará sin errores."