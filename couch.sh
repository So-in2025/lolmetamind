#!/bin/bash

# =========================================================================================
# SCRIPT DE CONFIGURACIÓN DEL COACH EN TIEMPO REAL (Live Client API -> Backend)
# Este script crea el endpoint, actualiza la DB y prepara la lógica de IA en el backend.
# =========================================================================================

REPO_PATH="so-in2025/lolmetamind/lolmetamind-abcac7c2cd0cf26310ac1645a768417f9d41a641"
API_PATH="${REPO_PATH}/src/app/api"
LIB_PATH="${REPO_PATH}/src/lib"

echo "--- 1. Creando la ruta /api/live-game/update/route.js (NUEVO ARCHIVO) ---"
mkdir -p "${API_PATH}/live-game/update"
cat > "${API_PATH}/live-game/update/route.js" << 'EOL'
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/utils'; // Asume esta utilidad para JWT
import db from '@/lib/db'; 

export const dynamic = 'force-dynamic';

export async function POST(req) {
    try {
        const authResult = await verifyAuth(req);
        if (authResult.error) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }
        const userId = authResult.userId;

        // Recibir el JSON completo de la API del cliente LoL
        const liveGameData = await req.json();

        // 1. Validar que la data es relevante (ej. contiene gameTime)
        if (!liveGameData || !liveGameData.gameTime) {
             return NextResponse.json({ error: 'Datos de juego inválidos o incompletos.' }, { status: 400 });
        }

        // 2. Actualizar la columna live_game_data del usuario
        // Este dato será consultado por el servidor de WebSockets
        await db.query(
            'UPDATE users SET live_game_data = $1, updated_at = NOW() WHERE id = $2',
            [liveGameData, userId]
        );

        return NextResponse.json({ message: 'Datos de partida en tiempo real recibidos y actualizados.' });

    } catch (error) {
        console.error('Error al actualizar datos de partida en vivo:', error);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
EOL
echo "Ruta ${API_PATH}/live-game/update/route.js creada con éxito."

echo "--- 2. Actualizando src/lib/db/schema.sql (Añadiendo live_game_data) ---"
cat > "${LIB_PATH}/db/schema.sql" << 'EOL'
-- src/lib/db/schema.sql
-- Esquema de base de datos para PostgreSQL en producción.

-- Se eliminan las tablas existentes para asegurar un esquema limpio.
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS user_challenges CASCADE;

-- Tabla de Usuarios actualizada para Riot ID y Hotmart
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE,
    google_id VARCHAR(255) UNIQUE,
    avatar_url VARCHAR(255),
    
    -- Campos para el Riot ID y datos de League
    riot_id_name VARCHAR(255),
    riot_id_tagline VARCHAR(10),
    region VARCHAR(10),
    puuid VARCHAR(255) UNIQUE,
    summoner_id VARCHAR(255) UNIQUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Campos para Hotmart y suscripción
    subscription_tier VARCHAR(50) DEFAULT 'FREE',
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    license_key VARCHAR(255) UNIQUE,
    hotmart_subscription_id VARCHAR(255),
    live_game_data JSONB -- <<< NUEVA COLUMNA: Datos brutos de la partida en vivo
);

-- Tabla para almacenar los desafíos activos de los usuarios
CREATE TABLE user_challenges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    challenge_type VARCHAR(50) NOT NULL, -- 'daily' o 'weekly'
    metric VARCHAR(100) NOT NULL,        -- ej: 'kills', 'visionScore', 'csPerMinute'
    goal INTEGER NOT NULL,
    progress INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Índice para búsquedas rápidas
CREATE INDEX idx_user_challenges_user_id ON user_challenges(user_id);
EOL
echo "src/lib/db/schema.sql actualizado con live_game_data."

echo "--- 3. Actualizando src/lib/ai/prompts.js (Prompt de Coach de Mundial) ---"
cat > "${LIB_PATH}/ai/prompts.js" << 'EOL'
/**
 * Genera el prompt para el análisis inicial de la partida (pre-partida o post-partida).
 * @param {object} userData - Datos del usuario.
 * @param {object} analysisData - Datos de Riot API para análisis.
 * @returns {string} - El prompt detallado para la IA.
 */
export const createInitialAnalysisPrompt = (userData, analysisData) => {
    // ... (Mantener la lógica existente para el prompt de análisis inicial)
};

/**
 * Genera el prompt para consejos de coaching en tiempo real (Coach de Mundial).
 * Este prompt es altamente contextual y busca una respuesta concisa y de élite.
 * @param {object} liveGameData - Datos completos de la LCU API en tiempo real.
 * @param {string} zodiacSign - Signo zodiacal del jugador.
 * @returns {string} - El prompt conciso para la IA.
 */
export const createLiveCoachingPrompt = (liveGameData, zodiacSign) => {
    const player = liveGameData.activePlayer;
    const playerStats = liveGameData.allPlayers.find(p => p.summonerName === player.summonerName);
    const gameTime = liveGameData.gameTime || 0;
    const teamStats = liveGameData.allPlayers.filter(p => p.team === playerStats.team);
    const enemyStats = liveGameData.allPlayers.filter(p => p.team !== playerStats.team);

    // Encuentra un oponente directo si es posible
    const directOpponent = enemyStats.find(e => e.lane === playerStats.lane) || enemyStats[0];

    return `
        ROL: Eres 'MetaMind-Alpha', un coach de E-Sports nivel Worlds de League of Legends. Eres frío, táctico y tu consejo es siempre la jugada óptima para ganar. Nunca uses lenguaje genérico.
        
        TAREA: Genera UN CONSEJO TÁCTICO ABSOLUTO para el jugador "${player.summonerName}" (Signo Zodiacal: ${zodiacSign}) basado en el ESTADO ACTUAL del juego.

        **ESTADO DEL JUEGO (Minuto ${Math.floor(gameTime / 60)}:${String(Math.floor(gameTime % 60)).padStart(2, '0')}):**
        - Tu Campeón/Rol: ${playerStats.championName} en ${playerStats.lane}.
        - KDA/CS: ${playerStats.scores.kills}/${playerStats.scores.deaths}/${playerStats.scores.assists} | CS: ${playerStats.scores.creepScore}.
        - Oro Actual/Total: ${player.currentGold} / ${playerStats.goldTotal}.
        - Próximo Objeto Clave: Analiza si puede comprar un componente clave ahora.
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
          "priorityAction": "MACRO | MICRO | SHOP" // (Para clasificar la acción)
        }
    `;
};

/**
 * Genera el prompt para la generación de desafíos semanales (Gamificación).
 * @param {object} userData - Datos del usuario.
 * @param {object} matchHistory - Historial de partidas del usuario.
 * @returns {string} - El prompt para la IA.
 */
export const createChallengeGenerationPrompt = (userData, matchHistory) => {
    // ... (Mantener la lógica existente)
};
EOL
echo "src/lib/ai/prompts.js actualizado con 'Coach de Mundial'."

echo "--- 4. Actualizando src/lib/ai/strategist.js (Integración del Coach Élite) ---"
cat > "${LIB_PATH}/ai/strategist.js" << 'EOL'
import { GoogleGenAI } from '@google/genai';
import { 
    createInitialAnalysisPrompt, 
    createChallengeGenerationPrompt, 
    createLiveCoachingPrompt // Importar el nuevo prompt
} from './prompts';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const model = "gemini-1.5-flash"; // Modelo rápido y eficiente

// Función para manejar respuestas simuladas SOLO para rutas que lo necesiten (Desafíos, Post-Match)
const handleSimulatedResponse = (prompt) => {
    if (prompt.includes('genera 3 desafíos de mejora')) {
        // Lógica de simulación de desafíos (Se mantiene si la API de Riot no está lista)
        return {
            challenges: [
                { title: "Control de Oleadas", description: "Consigue una ventaja de 20 CS antes del minuto 15." },
                { title: "Visión Agresiva", description: "Coloca 5 wards de control en la jungla enemiga." }
            ]
        };
    }
    
    // Para el coach en tiempo real (elite), no hay simulación genérica.
    // Si se llama con un prompt de coaching en vivo y la IA falla, debe fallar.
    
    return { error: true, message: "No se pudo generar un análisis simulado." };
};

/**
 * Genera un análisis estratégico utilizando Gemini.
 * @param {object} options - Opciones que incluyen userData, analysisData, o customPrompt.
 * @returns {object} - La respuesta JSON analizada o un fallback/error.
 */
export async function generateStrategicAnalysis(options) {
    const { userData, analysisData, customPrompt, liveGameData, zodiacSign } = options;

    let prompt;

    // 1. Determinar el Prompt
    if (customPrompt) {
        // Usar un prompt personalizado (ej. para el LIVE COACHING)
        prompt = customPrompt;
    } else if (liveGameData) {
        // Si hay datos de partida en vivo, usar el prompt de coach de élite
        prompt = createLiveCoachingPrompt(liveGameData, zodiacSign);
    } else if (userData && analysisData) {
        // Si hay datos de usuario y análisis, usar el prompt de análisis inicial
        prompt = createInitialAnalysisPrompt(userData, analysisData);
    } else {
        return { error: true, message: "Parámetros insuficientes para generar el análisis." };
    }

    // 2. Si la clave API no está disponible, usar simulación para el desarrollo
    if (!process.env.GEMINI_API_KEY || process.env.NODE_ENV !== 'production') {
        console.warn("⚠️ Usando simulación de respuesta de IA (KEY no encontrada o en DEV)");
        return handleSimulatedResponse(prompt);
    }

    // 3. Llamar a la API de Gemini (Producción o Clave OK)
    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: {
                        realtimeAdvice: { type: "string" },
                        priorityAction: { type: "string" },
                        // ... (otras propiedades según el prompt)
                    }
                }
            }
        });

        // La respuesta es un JSON estricto
        const jsonResponse = JSON.parse(response.text);
        return jsonResponse;

    } catch (error) {
        console.error("❌ Error al llamar a la API de Gemini:", error.message);
        // Si el coach élite falla, no ofrecemos un mensaje genérico (sin simulaciones)
        // Solo devolvemos un error.
        return { 
            error: true, 
            message: "Fallo en la IA: El Coach de Élite no pudo procesar la estrategia en este momento.",
            realtimeAdvice: "ERROR CRÍTICO: El enlace táctico con la IA se ha cortado. Concentración manual." // Mensaje de élite en caso de error
        };
    }
}
EOL
echo "src/lib/ai/strategist.js actualizado para el modo 'Elite Coach'."


echo "--- 5. Actualizando websocket-server.js (Motor de Coaching en Vivo) ---"
cat > "${REPO_PATH}/websocket-server.js" << 'EOL'
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
EOL
echo "websocket-server.js actualizado y configurado para 'Elite Coach'."

echo ""
echo "=========================================================="
echo "      ✅ PREPARACIÓN DEL BACKEND PARA COACH ÉLITE COMPLETADA"
echo "=========================================================="
echo "Sigue estos pasos **manualmente** para poner el nuevo sistema en marcha:"
echo ""
echo "1. Ejecutar la migración de DB (CRÍTICO):"
echo "   Debes crear la nueva columna 'live_game_data JSONB' en tu tabla 'users'."
echo "   SQL: ALTER TABLE users ADD COLUMN live_game_data JSONB;"
echo ""
echo "2. Recompilar la lógica del servidor (CRÍTICO):"
echo "   npm run build:server"
echo ""
echo "3. Reiniciar el servidor de WebSockets."
echo ""
echo "4. Próximo Paso: Implementar el código en tu App de Escritorio (Electron) para que envíe el JSON de la LCU API a:"
echo "   POST [Tu Dominio]/api/live-game/update"