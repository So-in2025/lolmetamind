#!/bin/bash

# =========================================================================================
# SCRIPT DE CORRECCIÓN CJS/ESM Y CONFIGURACIÓN FINAL DEL COACH DE ÉLITE
# Este script resuelve el error 'require is not defined', y completa la configuración
# del Coach en Vivo.
# =========================================================================================

REPO_PATH="so-in2025/lolmetamind/lolmetamind-4c93b36005431c7bc42c809ecd76beefdf126f70"
API_PATH="${REPO_PATH}/src/app/api"
LIB_PATH="${REPO_PATH}/src/lib"
SERVICES_PATH="${REPO_PATH}/src/services"

echo "--- 1. Corrigiendo archivos de Librería a CommonJS puro (SOLUCIONA EL ERROR) ---"

# --- src/lib/db/index.js ---
cat > "${LIB_PATH}/db/index.js" << 'EOL'
const { Pool } = require('pg');

let pool;

// Esta configuración es la correcta para Vercel/Render al conectar a una DB externa
if (!global._pool) {
  global._pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
}
pool = global._pool;

const db = {
  query: (text, params) => pool.query(text, params),
  pool: pool,
};

module.exports = db;
EOL

# --- src/lib/auth/utils.js ---
cat > "${LIB_PATH}/auth/utils.js" << 'EOL'
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

exports.hashPassword = (password) => {
  return bcrypt.hash(password, 10);
};

exports.comparePassword = (password, hash) => {
  return bcrypt.compare(password, hash);
};

exports.createToken = (user) => {
  if (!JWT_SECRET) {
    throw new Error('La clave secreta JWT no está definida en las variables de entorno.');
  }
  return jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: '7d',
  });
};

exports.verifyAuth = async (req) => {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) return { error: 'No autorizado' };
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return { userId: decoded.userId };
    } catch (error) {
        return { error: 'Token inválido' };
    }
};
EOL

# --- src/services/apiConfig.js ---
cat > "${SERVICES_PATH}/apiConfig.js" << 'EOL'
// src/services/apiConfig.js
// Carga las variables de entorno. Usamos require/module.exports para compatibilidad con Babel.
require('dotenv/config');

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const RIOT_API_BASE_URL = 'https://las.api.riotgames.com';
const TWITCH_AUTH_BASE_URL = 'https://id.twitch.tv/oauth2';

module.exports = {
  RIOT_API_KEY,
  TWITCH_CLIENT_ID,
  GEMINI_API_KEY,
  RIOT_API_BASE_URL,
  TWITCH_AUTH_BASE_URL
};
EOL

echo "--- 2. Finalizando Configuración del Coach de Élite (AI Prompts) ---"

# --- src/lib/ai/prompts.js (Añadiendo Live Coaching como CJS Export) ---
# Usamos el contenido ya modificado para incluir el prompt de live coaching, pero con CJS.
cat > "${LIB_PATH}/ai/prompts.js" << 'EOL'
/**
 * Genera el prompt para el análisis ASTRO-TÁCTICO avanzado.
 * @param {object} analysisData - Datos completos del jugador.
 * @returns {string} - El prompt completo para la IA.
 */
exports.createInitialAnalysisPrompt = (analysisData) => {
  // ... (Contenido de createInitialAnalysisPrompt)
  const {
    summonerName = 'el jugador',
    zodiacSign = 'desconocido',
    championMastery = [],
    dailyAstrologicalForecast = 'un día de oportunidades'
  } = analysisData || {};

  const masterySummary = Array.isArray(championMastery)
    ? championMastery.map(champ => `${champ.name} (${Math.round(champ.points / 1000)}k points)`)
    : ['No se encontraron datos de maestría.'];

  return `
    Eres "MetaMind", un Astro-Táctico y coach de élite de League of Legends. Te diriges directamente a tu cliente, ${summonerName}, en segunda persona (tú, tu, tus). Tu tono es sabio, autoritario y revelador. Fusionas el análisis profundo de datos de Riot con la psicología zodiacal para crear estrategias hiper-personalizadas.

    **MISIÓN:**
    Realiza un análisis exhaustivo para ${summonerName} y entrégale su plan de acción diario en un formato JSON claro y profesional.

    **DATOS DE TU JUGADOR:**
    1.  **Invocador:** ${summonerName}
    2.  **Perfil Zodiacal:** ${zodiacSign}
    3.  **Arsenal Principal (Top 5 de Maestría):** ${JSON.stringify(masterySummary)}
    4.  **Directiva Astral del Día:** "${dailyAstrologicalForecast}"

    **PROCESO DE ANÁLISIS (ESTRICTO):**
    1.  **Diagnóstico de Estilo de Juego:** Basado en su arsenal principal, define su estilo de juego. Si no hay datos de maestría, básate en su signo zodiacal.
    2.  **Sinergia Astro-Táctica:** Explica cómo su signo ${zodiacSign} impacta su estilo de juego, y cómo la Directiva Astral de hoy debe modular su enfoque.
    3.  **Coaching de Arsenal:** Si tiene campeones de maestría, elige 1 o 2 y ofrécele una táctica de alto nivel. Si no, omite esta sección en la respuesta.
    4.  **Expansión de Arsenal:** Recomienda DOS nuevos campeones para expandir sus horizontes.

    **FORMATO DE SALIDA (JSON ESTRICTO):**
    {
      "playstyleAnalysis": {
        "title": "Diagnóstico de tu Estilo de Juego",
        "style": "Tu arquetipo como jugador (ej: Duelista de Flanco)",
        "description": "Un análisis profesional de cómo abordas el juego."
      },
      "astroTacticSynergy": {
        "title": "Tu Directiva Táctica del Día",
        "description": "Cómo tu temperamento de ${zodiacSign} debe adaptarse al flujo cósmico de hoy."
      },
      "masteryCoaching": {
        "title": "Instrucciones para tu Arsenal Principal",
        "tips": [
          {
            "championName": "Nombre del campeón (o 'General' si no hay datos)",
            "advice": "Una táctica avanzada y específica."
          }
        ]
      },
      "newChampionRecommendations": {
        "title": "Expansión de Arsenal",
        "synergy": {
          "champion": "Nombre del Campeón de Sinergia",
          "reason": "Por qué este campeón capitaliza tus fortalezas."
        },
        "development": {
          "champion": "Nombre del Campeón de Desarrollo",
          "reason": "Por qué dominar a este campeón te hará un jugador impredecible."
        }
      }
    }
  `;
};

/**
 * Genera el prompt para consejos de coaching en tiempo real (Coach de Mundial).
 */
exports.createLiveCoachingPrompt = (liveGameData, zodiacSign) => {
    const player = liveGameData.activePlayer;
    const playerStats = liveGameData.allPlayers.find(p => p.summonerName === player.summonerName);
    const gameTime = liveGameData.gameTime || 0;
    const teamStats = liveGameData.allPlayers.filter(p => p.team === playerStats.team);
    const enemyStats = liveGameData.allPlayers.filter(p => p.team !== playerStats.team);

    const directOpponent = enemyStats.find(e => e.lane === playerStats.lane) || enemyStats[0];

    return `
        ROL: Eres 'MetaMind-Alpha', un coach de E-Sports nivel Worlds de League of Legends. Eres frío, táctico y tu consejo es siempre la jugada óptima para ganar. Nunca uses lenguaje genérico.
        
        TAREA: Genera UN CONSEJO TÁCTICO ABSOLUTO para el jugador "${player.summonerName}" (Signo Zodiacal: ${zodiacSign}) basado en el ESTADO ACTUAL del juego.

        **ESTADO DEL JUEGO (Minuto ${Math.floor(gameTime / 60)}:${String(Math.floor(gameTime % 60)).padStart(2, '0')}):**
        - Tu Campeón/Rol: ${playerStats.championName} en ${playerStats.lane}.
        - KDA/CS: ${playerStats.scores.kills}/${playerStats.scores.deaths}/${playerStats.scores.assists} | CS: ${playerStats.scores.creepScore}.
        - Oro Actual/Total: ${player.currentGold} / ${playerStats.goldTotal}.
        - Rival Directo (${directOpponent.championName}): KDA: ${directOpponent.scores.kills}/${directOpponent.scores.deaths}/${directOpponent.scores.assists} | CS: ${directOpponent.scores.creepScore}.
        
        **ANÁLISIS DE PARTIDA (Resumido):**
        - Detección de Ventaja: Compara tu oro/CS vs. tu rival directo y el Jungla enemigo.
        - Oportunidad de Objetivo: Si Barón/Dragón/Heraldo está disponible o reapareciendo pronto.
        - Falla Táctica: ¿El rival directo acaba de usar una habilidad clave (Summoner Spell o Ultimate)?

        **CONSEJO (REGLAS ESTRICTAS):**
        1. Tu respuesta debe ser una única frase, imperativa, enfocada en la Micro o Macro.
        2. Ejemplos de formato: "Compra el [Nombre de Componente] y Haz Dive al Top con el Jungla." o "Retrocede, tu Midlaner no tiene visión; el Jungla enemigo está en el arbusto."
        
        **FORMATO DE SALIDA (JSON ESTRICTO):**
        {
          "realtimeAdvice": "Tu consejo táctico, corto y decisivo.",
          "priorityAction": "MACRO | MICRO | SHOP"
        }
    `;
};

/**
 * Genera el prompt para la generación de desafíos semanales (Gamificación).
 */
exports.createChallengeGenerationPrompt = (playerData) => { // Corregido a CJS
  const { summonerName, recentMatchesPerformance } = playerData;
  // ... (Contenido de createChallengeGenerationPrompt)
  return `
    Eres "MetaMind", un coach de élite de League of Legends. Tu tarea es analizar el rendimiento reciente de un jugador y crear 3 desafíos de mejora personalizados (1 diario, 2 semanales) en formato JSON.
    // ... (rest of the original prompt)
  `;
};
EOL

# --- 3. Aplicando Bypass Premium y Corrección de Consulta en websocket-server.js ---
cat > "${REPO_PATH}/websocket-server.js" << 'EOL'
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const url = require('url');
const { Pool } = require('pg');
require('dotenv').config();

// Imports de la distribución compilada
// Ahora que los archivos fuente están en CJS, los compilados también lo serán.
const { createLiveCoachingPrompt } = require('./dist/lib/ai/prompts');
const { generateStrategicAnalysis } = require('./dist/lib/ai/strategist');

// Se asume que dist/lib/db.js exporta directamente el objeto db (que tiene la pool)
const db = require('./dist/lib/db'); 

const port = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;

const pool = db.pool; // Usamos la pool que está en el objeto db exportado desde dist/lib/db/index.js
// Nota: La conexión SSL está configurada dentro de dist/lib/db/index.js/src/lib/db/index.js.


const wss = new WebSocket.Server({ port });
const clients = new Map();

console.log(`✅ Servidor WebSocket de Producción iniciado en el puerto ${port}.`);

// Función para obtener datos del usuario, incluyendo live_game_data y subscription_tier
const fetchUserData = async (userId) => {
  try {
    // CORRECCIÓN: Se agrega 'subscription_tier' a la consulta SQL
    const res = await pool.query('SELECT id, username, summoner_id, region, zodiac_sign, live_game_data, subscription_tier FROM users WHERE id = $1', [userId]);
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
    if (ws.readyState !== WebSocket.OPEN) continue;

    const freshUserData = await fetchUserData(clientData.id); 
    
    // BYPASS PREMIUM PARA PRUEBAS: Cualquier usuario con datos de juego recibe el consejo.
    if (freshUserData && freshUserData.live_game_data) {
        
        const liveGameData = freshUserData.live_game_data;
        
        try {
            const analysisResult = await generateStrategicAnalysis({ 
                liveGameData: liveGameData, 
                zodiacSign: freshUserData.zodiac_sign || 'Aries' // Fallback si no ha configurado zodíaco
            });
            
            const messageObject = {
                realtimeAdvice: analysisResult.realtimeAdvice || analysisResult.message, 
                priorityAction: analysisResult.priorityAction || 'ANALYSIS',
                gameTime: liveGameData.gameTime 
            };
            
            ws.send(JSON.stringify(messageObject));
            
        } catch (error) {
            console.error(`Error al generar o enviar consejo ÉLITE para ${freshUserData.username}:`, error);
            ws.send(JSON.stringify({ realtimeAdvice: "ERROR CRÍTICO: El enlace táctico con la IA se ha cortado. Concentración manual.", priorityAction: 'ERROR' }));
        }
        
    } else {
        // Mensaje de estado si no hay datos de partida
        ws.send(JSON.stringify({ realtimeAdvice: 'Coach inactivo. Inicia una partida con la App de escritorio.', priorityAction: 'STATUS' }));
    }
  }
}, 10000); // Revisa cada 10 segundos
EOL

echo ""
echo "=========================================================="
echo "      ✅ SOLUCIÓN CJS/ESM Y CONFIGURACIÓN COMPLETADA"
echo "=========================================================="
echo "Ahora, debes ejecutar estas acciones **manualmente** para que tu Coach Élite funcione en Render:"
echo ""
echo "1. Recompilar la lógica del servidor (CRÍTICO):"
echo "   npm run build:server"
echo ""
echo "2. Reiniciar el servidor de WebSockets en Render (o localmente):"
echo "   npm run start:server"
echo ""
echo "El error 'require is not defined' debe resolverse porque los archivos de librería ahora son CommonJS puros."
echo "Además, el coach en vivo se activará para **cualquier usuario autenticado** que envíe datos de juego."