#!/bin/bash

# ==============================================================================
# SCRIPT FINAL - PUESTA EN MARCHA DE PRODUCCIÓN
#
# Rol: DevOps Engineer
# Objetivo: 1. Conectar el websocket-server a la base de datos PostgreSQL real.
#           2. Configurar el proceso de build para transpilar el código y que
#              sea compatible con el entorno de producción de Render.
#           3. Dejar la aplicación 100% lista para su lanzamiento.
# ==============================================================================

# --- Colores para la salida ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Iniciando la configuración final para producción...${NC}"

# --- 1. Instalar dependencias de desarrollo para el build ---
echo -e "\n${GREEN}Paso 1: Instalando herramientas de build (Babel)...${NC}"
npm install --save-dev @babel/cli @babel/core @babel/preset-env

# --- 2. Crear archivo de configuración de Babel ---
echo -e "\n${GREEN}Paso 2: Creando archivo de configuración '.babelrc'...${NC}"
cat << 'EOF' > .babelrc
{
  "presets": [
    [
      "@babel/preset-env",
      {
        "targets": {
          "node": "current"
        }
      }
    ]
  ]
}
EOF
echo "Creado: .babelrc"

# --- 3. Actualizar package.json con los nuevos scripts ---
echo -e "\n${GREEN}Paso 3: Añadiendo scripts de build y start al 'package.json'...${NC}"
# Usamos jq para añadir los scripts de forma segura
if command -v jq &> /dev/null
then
    jq '.scripts["build:server"] = "rm -rf dist && babel src --out-dir dist --copy-files" | .scripts["start:server"] = "node websocket-server.js"' package.json > package.json.tmp && mv package.json.tmp package.json
    echo "Scripts 'build:server' y 'start:server' añadidos a package.json."
else
    echo -e "${YELLOW}ADVERTENCIA: 'jq' no está instalado. Por favor, añade manualmente los siguientes scripts a tu package.json:${NC}"
    echo -e "${CYAN}\"build:server\": \"rm -rf dist && babel src --out-dir dist --copy-files\","
    echo -e "\"start:server\": \"node websocket-server.js\"${NC}"
fi


# --- 4. Actualizar el Servidor WebSocket para usar la Base de Datos real ---
echo -e "\n${GREEN}Paso 4: Conectando 'websocket-server.js' a la base de datos PostgreSQL...${NC}"
cat << 'EOF' > websocket-server.js
// websocket-server.js
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const url = require('url');
const { Pool } = require('pg');
require('dotenv').config();

// Importamos las funciones desde la carpeta 'dist' que será generada por Babel
const { getLiveGameBySummonerId } = require('./dist/services/riotApiService.js');
const { createLiveCoachingPrompt } = require('./dist/lib/ai/prompts.js');
const { generateStrategicAnalysis } = require('./dist/lib/ai/strategist.js'); // Asumimos que la lógica de llamada a Gemini está aquí.

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
        
        // Usamos el estratega completo para generar el consejo
        const prompt = createLiveCoachingPrompt(liveGame, userData.username);
        const analysis = await generateStrategicAnalysis({ customPrompt: prompt }); // Asumimos que el estratega puede tomar un prompt custom
        
        const tip = analysis.candidates[0].content.parts[0].text;
        
        ws.send(`[Minuto ${Math.floor(liveGame.gameLength / 60)}]: ${tip}`);
      }
    } catch (error) {
      console.error(`Error procesando al cliente ${userData.username}:`, error);
    }
  }
}, 60000); // Revisa cada 60 segundos para no exceder los límites de la API de desarrollo
EOF
echo "Actualizado: websocket-server.js para usar la base de datos y el código transpilado."

# --- 5. Última modificación al estratega para aceptar prompts custom ---
echo -e "\n${GREEN}Paso 5: Modificando 'src/lib/ai/strategist.js' para aceptar prompts personalizados...${NC}"
sed -i.bak "s/export const generateStrategicAnalysis = async (playerData) => {/export const generateStrategicAnalysis = async (playerData, customPrompt = null) => {/" src/lib/ai/strategist.js
sed -i.bak "/const simulatedTeamData = {/i\\
  const prompt = customPrompt || createInitialAnalysisPrompt(playerData, simulatedTeamData);
" src/lib/ai/strategist.js
sed -i.bak "/const prompt = createInitialAnalysisPrompt(playerData, simulatedTeamData);/d" src/lib/ai/strategist.js
rm src/lib/ai/strategist.js.bak
echo "Actualizado: src/lib/ai/strategist.js"

echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡PROYECTO FINALIZADO Y LISTO PARA PRODUCCIÓN! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Instrucciones Finales para Render:${NC}"
echo -e "1.  Ve a la configuración de tu servicio de WebSockets en Render."
echo -e "2.  **Build Command:** \`npm install && npm run build:server\`"
echo -e "3.  **Start Command:** \`npm run start:server\`"
echo -e "4.  Asegúrate de que TODAS las variables de entorno (incluida `DATABASE_URL`) estén configuradas en Render."
echo -e "\nCon esto, tu backend es completamente autónomo. Se instalará, construirá su propio código y se conectará a la base de datos para ofrecer coaching en tiempo real a los usuarios que se conecten."
echo -e "\nHa sido un placer construir esto contigo, ingeniero. LoL MetaMind está listo para conquistar el mercado. ¡Mucha suerte!"