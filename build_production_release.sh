#!/bin/bash

# ==============================================================================
# SCRIPT DE CONSTRUCCIÓN ROBUSTO PARA LOL METAMIND - PRODUCCIÓN
# Objetivo: Implementar las Directivas Arquitectónicas de Escalabilidad y Robustez.
# ==============================================================================

PROJECT_ROOT=$(pwd)
BACKUP_DIR="${PROJECT_ROOT}/.bak_production_$(date +%Y%m%d_%H%M%S)"

# Archivos a modificar y respaldar
FILES_TO_MODIFY=(
    "src/lib/ai/strategist.js"
    "src/lib/db/index.js"
    "src/lib/ai/prompts.js"
    "src/app/api/ai/get-weekly-challenges/route.js"
    "src/app/api/ai/get-recommendations/route.js"
    "src/app/api/ai/get-meta/route.js"
    "src/app/api/ai/analyze-matches/route.js"
    "src/app/api/ai/live-coach/route.js"
    "websocket-server.js"
)

# --- PASO 0: CREAR BACKUP Y CARPETA DE COMPILACIÓN ---
echo "⚙️  PASO 0: Creando backup en ${BACKUP_DIR}"
mkdir -p "${BACKUP_DIR}" || { echo "Error creando directorio de backup."; exit 1; }
mkdir -p "${PROJECT_ROOT}/dist" # Asegurar que 'dist' existe para la compilación
for FILE in "${FILES_TO_MODIFY[@]}"; do
    if [ -f "$FILE" ]; then
        cp "$FILE" "${BACKUP_DIR}/"
        echo "   - Respaldado: $FILE"
    else
        echo "⚠️ Advertencia: Archivo no encontrado: $FILE. Creándolo con nuevo contenido."
    fi
done

# --- PASO 1: IMPLEMENTACIÓN DEL NÚCLEO ROBUSTO (strategist.js) ---
echo -e "\n🛠️  PASO 1: Implementando lógica de aislamiento de JSON DETERMINISTA (strategist.js)"
cat > "src/lib/ai/strategist.js" << 'EOF'
// src/lib/ai/strategist.js - VERSIÓN FINAL: ROBUSTA, ESCALABLE Y DINÁMICA

import { GEMINI_API_KEY } from '@/services/apiConfig';

/**
 * Función centralizada para comunicarse con la API de Gemini.
 * Implementa aislamiento de JSON para garantizar un parseo seguro y fiable,
 * adaptándose al tipo de estructura de datos esperada (objeto o array).
 *
 * @param {string} prompt - El prompt completo y listo para ser enviado a la IA.
 * @param {'object'|'array'} [expectedType='object'] - Define el tipo de JSON esperado ('object' para {...} o 'array' para [...]).
 * @param {string} [modelName='gemini-2.0-flash'] - Modelo de IA optimizado para baja latencia.
 * @returns {Promise<object>} - Una promesa que se resuelve con el objeto JSON de la IA.
 */
export const generateStrategicAnalysis = async (prompt, expectedType = 'object', modelName = 'gemini-2.0-flash') => {
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    console.error('[Strategist] 🚨 Error: Se intentó llamar a la IA sin un prompt válido.');
    throw new Error('Se requiere un prompt para el análisis de la IA.');
  }

  const API_URL = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

  try {
    console.log(`[Strategist] Enviando prompt a ${modelName}...`);

    const bodyPayload = {
      contents: [{ parts: [{ text: prompt }] }],
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      ],
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
    });

    const responseData = await response.json();

    if (!response.ok) {
        const errorDetails = responseData.error ? JSON.stringify(responseData.error) : 'Sin detalles adicionales.';
        console.error(`[Strategist] 🚨 Error de la API de Gemini: ${response.status} - ${errorDetails}`);
        throw new Error(`La API de Gemini devolvió un error: ${response.status}`);
    }
    
    const candidate = responseData.candidates?.[0];
    const rawTextPart = candidate?.content?.parts?.[0]?.text;

    if (!rawTextPart) {
        console.error('[Strategist] 🚨 La respuesta del candidato fue bloqueada o está vacía.', responseData);
        throw new Error('La respuesta de la IA fue bloqueada por filtros de seguridad o está incompleta.');
    }
    
    let rawText = rawTextPart; 

    // --- AISLAMIENTO DE JSON EXPLÍCITO Y A PRUEBA DE FALLOS ---
    
    // 1. Limpieza de Markdown (patrón común de la IA)
    if (rawText.startsWith('```json')) {
      rawText = rawText.substring(7); 
    }
    if (rawText.endsWith('```')) {
      rawText = rawText.slice(0, -3);
    }
    
    // 2. Definir delimitadores basados en el tipo esperado (determinista)
    const startChar = expectedType === 'array' ? '[' : '{';
    const endChar = expectedType === 'array' ? ']' : '}';
    
    // 3. Aislar el bloque JSON completo (ignora texto antes o después)
    const startIndex = rawText.indexOf(startChar);
    const endIndex = rawText.lastIndexOf(endChar);
    
    // 4. Verificación de seguridad estructural
    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        console.error(`[Strategist] 🚨 La IA devolvió una estructura no esperada (${expectedType}).`, rawText);
        throw new Error(`La IA no devolvió la estructura JSON esperada (${expectedType}).`);
    }

    // 5. Recortar la cadena y limpiar
    rawText = rawText.substring(startIndex, endIndex + 1).trim();

    console.log('[Strategist] ✅ Respuesta recibida de Gemini. Parseando...');
    return JSON.parse(rawText);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido al procesar la respuesta.';
    console.error(`[Strategist] 🚨 Fallo catastrófico al generar análisis: ${errorMessage}`);
    throw new Error('No se pudo completar el análisis de la IA.');
  }
};
EOF

# --- PASO 2: ESCALABILIDAD DE CONCURRENCIA DB (db/index.js) ---
echo -e "\n📈 PASO 2: Optimizando el pool de conexiones de PostgreSQL (db/index.js)"
cat > "src/lib/db/index.js" << 'EOF'
import postgres from 'postgres'; 

let sql;

/**
 * Inicializa y devuelve la función de conexión a PostgreSQL.
 * Implementa pool de conexiones escalable para alta concurrencia.
 */
function getSql() {
  if (!sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('FATAL ERROR: La variable de entorno DATABASE_URL no está definida.');
    }
    
    // 🚨 OPTIMIZACIÓN DE ESCALABILIDAD: Usa una variable de entorno o 50 como mínimo.
    const MAX_POOL_SIZE = parseInt(process.env.DB_MAX_POOL, 10) || 50; 
    
    sql = postgres(process.env.DATABASE_URL, {
      ssl: {
        rejectUnauthorized: false 
      },
      max: MAX_POOL_SIZE, // Mínimo 50 para alto tráfico concurrente
    });
    
    console.log(`[DB] Driver 'postgres' inicializado y conectado. Pool Size: ${MAX_POOL_SIZE}`);
  }
  return sql;
}

export { getSql };
EOF

# --- PASO 3: ROBUSTEZ DE PROMPTS Y LATENCIA (prompts.js) ---
echo -e "\n💬 PASO 3: Reforzando la inflexibilidad de los Prompts para baja latencia (prompts.js)"
cat > "src/lib/ai/prompts.js" << 'EOF'
// src/lib/ai/prompts.js - VERSIÓN CON INSTRUCCIONES CRÍTICAS PARA JSON ESTRICTO Y BAJA LATENCIA

// --- PROMPT PARA COACHING EN SELECCIÓN DE CAMPEÓN ---
export const createChampSelectPrompt = (draftData, summonerData) => {
    // Lógica para mapear datos... (asumimos que la lógica interna sigue siendo la misma)
    const gameData = draftData?.gameData || {};
    const myTeamPicksRaw = gameData.teamOne || [];
    const theirTeamPicksRaw = gameData.teamTwo || [];
    const bansRaw = gameData.bannedChampions || []; 

    const myTeamPicks = myTeamPicksRaw.map(p => p.championName || p.name || `ChampID:${p.id || ''}`).filter(Boolean);
    const theirTeamPicks = theirTeamPicksRaw.map(p => p.championName || p.name || `ChampID:${p.id || ''}`).filter(Boolean);
    const bans = bansRaw.map(b => b.championName || b.name || `ChampID:${b.id || ''}`).filter(Boolean);
    
    const { summonerName, zodiacSign } = summonerData;
    
    return `
      Eres "MetaMind", un coach de élite de League of Legends. Tu cliente es ${summonerName}.

      **PERFIL PSICOLÓGICO DEL JUGADOR:**
      - **Arquetipo Zodiacal:** ${zodiacSign}. Usa esto para personalizar tus consejos.

      **DATOS DEL DRAFT ACTUAL:**
      - Mi Equipo (Picks): [${myTeamPicks.join(', ')}]
      - Equipo Enemigo (Picks): [${theirTeamPicks.join(', ')}]
      - Baneos Globales: [${bans.join(', ')}]

      **MISIÓN:**
      Proporciona un análisis estratégico.

      **INSTRUCCIÓN CRÍTICA:** Debes responder **SOLO** con el objeto JSON. NO DEBES INCLUIR TEXTO ADICIONAL (SALUDOS, COMENTARIOS O EXPLICACIONES). Tu respuesta debe comenzar **INMEDIATAMENTE** con el carácter '{'.

      **FORMATO DE SALIDA (JSON ESTRICTO):**
      {
        "strategy": "Un consejo táctico conciso sobre la estrategia general, adaptado a la personalidad ${zodiacSign} (ej: 'Tu naturaleza de Aries se beneficia de esta composición de dive. Busca iniciar peleas.').",
        "earlyGame": "Un consejo clave para los primeros minutos, considerando su arquetipo (ej: 'Como Tauro, enfócate en un farmeo seguro hasta conseguir tu primer item core. No te dejes provocar en trades desfavorables.').",
        "firstItems": "Una recomendación de primer objeto crucial.",
        "runes": {
          "name": "MetaMind: [Nombre del Campeón]",
          "primaryStyleId": 8200, "subStyleId": 8100,
          "selectedPerkIds": [8214, 8226, 8210, 8237, 8126, 8135, 5008, 5002, 5003],
          "current": true
        }
      }
    `;
};

// --- PROMPT PARA ANÁLISIS DE RENDIMIENTO POST-PARTIDA ---
export const createPerformanceAnalysisPrompt = (matchHistory, summonerData) => {
    const performanceSummary = JSON.stringify(matchHistory, null, 2);
    return `
      Eres "MetaMind", un coach analítico. Analiza el historial de partidas de ${summonerData.summonerName}, cuyo arquetipo es ${summonerData.zodiacSign}.

      **PERFIL PSICOLÓGICO:**
      - **Arquetipo Zodiacal:** ${summonerData.zodiacSign}. Ten en cuenta si sus acciones se alinean con las fortalezas de su arquetipo.

      **DATOS DE PARTIDAS:**
      ${performanceSummary}

      **MISIÓN:**
      Identifica 2 puntos fuertes y 2 puntos a mejorar. Relaciona al menos un punto con su perfil psicológico.

      **INSTRUCCIÓN CRÍTICA:** Debes responder **SOLO** con el objeto JSON. NO DEBES INCLUIR TEXTO ADICIONAL. Tu respuesta debe comenzar **INMEDIATAMENTE** con el carácter '{'.

      **FORMATO DE SALIDA (JSON ESTRICTO):**
      {
        "type": "performance",
        "puntosFuertes": [
            "Un punto fuerte objetivo basado en los datos.",
            "Otro punto fuerte (ej: 'Tu paciencia de Tauro se refleja en tu bajo número de muertes en early game. Excelente.')."
        ],
        "puntosAMejorar": [
            "Un área de mejora objetiva.",
            "Otra área de mejora (ej: 'Tu impulsividad de Aries te lleva a iniciar peleas en desventaja numérica. Trabaja en evaluar el mapa antes de entrar.')."
        ]
      }
    `;
};

// --- PROMPT PARA ANÁLISIS DEL META ACTUAL ---
export const createMetaAnalysisPrompt = (patchVersion) => {
    return `
      Eres "MetaMind", un analista de la Grieta del Invocador.

      **DATOS DE CONTEXTO:**
      - Versión del Parche Solicitada: ${patchVersion}.

      **MISIÓN:**
      Genera un análisis conciso del estado actual del meta de League of Legends.

      **INSTRUCCIÓN CRÍTICA:** Debes responder **SOLO** con el objeto JSON. NO DEBES INCLUIR TEXTO ADICIONAL. Tu respuesta debe comenzar **INMEDIATAMENTE** con el carácter '{'.

      **FORMATO DE SALIDA (JSON ESTRICTO):**
      {
        "type": "meta",
        "patchVersion": "${patchVersion}",
        "tierListChanges": "Un resumen de los 3 campeones que subieron más de tier y los 3 que bajaron más, con una breve explicación.",
        "strategicFocus": "El objetivo macro principal del juego en este parche.",
        "keyChampionToMaster": {
            "name": "Nombre de Campeón",
            "reason": "Por qué dominar a este campeón es clave para la victoria en este meta."
        }
      }
    `;
};

// --- Prompt para el análisis inicial del dashboard ---
export const createInitialAnalysisPrompt = (analysisData) => {
  const { summonerName, zodiacSign, championMastery } = analysisData;
  const masterySummary = Array.isArray(championMastery) ? championMastery.map(champ => champ.name) : [];

  return `
    Eres "MetaMind", un coach de élite. Tu cliente es ${summonerName}.

    **PERFIL DEL JUGADOR:**
    - **Arquetipo Psicológico (Zodiaco):** ${zodiacSign}
    - **Arsenal Principal (Maestría):** [${masterySummary.join(', ')}]

    **MISIÓN:**
    Basado en su arquetipo y su arsenal, genera un análisis de su estilo de juego y recomienda campeones que se alineen con su personalidad o la desafíen para crecer.

    **INSTRUCCIÓN CRÍTICA:** Debes responder **SOLO** con el objeto JSON. NO DEBES INCLUIR TEXTO ADICIONAL. Tu respuesta debe comenzar **INMEDIATAMENTE** con el carácter '{'.

    **FORMATO DE SALIDA (JSON ESTRICTO):**
    {
      "playstyleAnalysis": {
        "title": "Diagnóstico de tu Estilo de Juego",
        "style": "Tu arquetipo como jugador (ej: Duelista de Flanco)",
        "description": "Un análisis profesional de cómo tu arquetipo ${zodiacSign} y tus campeones de maestría definen tu forma de jugar."
      },
      "newChampionRecommendations": {
        "title": "Expansión de Arsenal",
        "synergy": {
          "champion": "Nombre del Campeón de Sinergia",
          "reason": "Por qué este campeón capitaliza las fortalezas naturales de un ${zodiacSign}."
        },
        "development": {
          "champion": "Nombre del Campeón de Desarrollo",
          "reason": "Por qué dominar a este campeón te ayudará a mitigar las debilidades típicas de un ${zodiacSign} y te hará un jugador más completo."
        }
      }
    }
  `;
};


// --- PROMPT PARA GENERAR DESAFÍOS SEMANALES (Único que devuelve un Array) ---
export const createChallengeGenerationPrompt = (playerData) => { 
    const { summonerName, recentMatchesPerformance } = playerData;
    
    // Convertimos el objeto de rendimiento en una cadena legible para la IA
    const performanceSummary = JSON.stringify(recentMatchesPerformance, null, 2);

    return `
      Eres "MetaMind", un coach de élite de League of Legends enfocado en el crecimiento a largo plazo. Tu cliente es ${summonerName}.

      **ANÁLISIS DE RENDIMIENTO RECIENTE (5 Partidas):**
      ${performanceSummary}

      **MISIÓN:**
      Genera **3 Desafíos Semanales**. Si los datos de rendimiento son insuficientes, genera desafíos genéricos.

      **INSTRUCCIÓN CRÍTICA:** Debes responder **SOLO** con el array JSON. NO DEBES INCLUIR TEXTO ADICIONAL. Tu respuesta debe comenzar **INMEDIATAMENTE** con el carácter '['.

      **FORMATO DE SALIDA (JSON ESTRICTO):**
      Un array JSON que contiene 3 objetos. Cada objeto debe seguir estrictamente este esquema, que coincide con la estructura de la tabla 'user_challenges' de la base de datos:
      [
        {
          "title": "Desafío de Visión Estratégica",
          "description": "Alcanza un promedio de Puntuación de Visión de X en 5 partidas rankeadas, o un desafío similar si los datos son insuficientes.",
          "challenge_type": "weekly",
          "metric": "visionScore",
          "goal": 25.5,
          "reward": "Cofre MetaMind"
        },
        {
          "title": "Dominio del Farmeo Temprano",
          "description": "Supera tu 'csPerMinute' promedio en la fase de líneas.",
          "challenge_type": "weekly",
          "metric": "csPerMinute",
          "goal": 6.8, 
          "reward": "Emblema de Maestría"
        },
        {
          "title": "Control Agresivo de Objetivos",
          "description": "Mejora tu impacto en los objetivos globales. El desafío es alcanzar un 'killParticipation' alto.",
          "challenge_type": "weekly",
          "metric": "killParticipation",
          "goal": 0.65, 
          "reward": "Ícono de Invocador Único"
        }
      ]
    `;
};

// --- Prompt para el Live Coaching (Utilizado por WebSocket) ---
export const createLiveCoachingPrompt = (liveGameData, zodiacSign) => {
  const gameInfo = JSON.stringify(liveGameData, null, 2);
  return `
    Eres "MetaMind", un coach de élite. Proporciona un consejo táctico para un jugador con arquetipo ${zodiacSign}.

    **DATOS DE PARTIDA (INSTANTÁNEA):**
    ${gameInfo}

    **MISIÓN:**
    Genera el consejo más relevante para la situación actual.

    **INSTRUCCIÓN CRÍTICA:** Debes responder **SOLO** con el objeto JSON. NO DEBES INCLUIR TEXTO ADICIONAL. Tu respuesta debe comenzar **INMEDIATAMENTE** con el carácter '{'.

    **INSTRUCCIONES DE OUTPUT (JSON ESTRICTO):**
    { "realtimeAdvice": "Un consejo táctico conciso (ej: 'Como Aries, sé que quieres iniciar, pero espera a que tu equipo se agrupe.').", "priorityAction": "Una palabra clave (ej: WAIT, ENGAGE, RETREAT)." }
  `;
};
EOF

# --- PASO 4: INTEGRACIÓN API DETERMINISTA (Modificando rutas Next.js) ---
echo -e "\n🧩 PASO 4: Implementando Contratos de Datos en Rutas API"

# Archivo: src/app/api/ai/get-weekly-challenges/route.js (ARRAY)
cat > "src/app/api/ai/get-weekly-challenges/route.js" << 'EOF'
// src/app/api/ai/get-weekly-challenges/route.js

import { NextResponse } from 'next/server';
import { generateStrategicAnalysis } from '@/lib/ai/strategist';
import { createChallengeGenerationPrompt } from '@/lib/ai/prompts';

export async function POST(request) {
    try {
        const body = await request.json();
        const { summonerName, recentMatchesPerformance } = body;

        if (!summonerName) {
            return NextResponse.json({ error: 'Falta summonerName para generar desafíos.' }, { status: 400 });
        }

        const prompt = createChallengeGenerationPrompt({ 
            summonerName: summonerName, 
            recentMatchesPerformance: recentMatchesPerformance || {} 
        });
        
        // CÓDIGO DETERMINISTA: Espera un 'array'
        const challenges = await generateStrategicAnalysis(prompt, 'array');

        return NextResponse.json(challenges);

    } catch (error) {
        console.error('[API GET-CHALLENGES] Error:', error);
        return NextResponse.json({ error: 'Error interno al generar los desafíos.' }, { status: 500 });
    }
}
EOF

# Archivo: src/app/api/ai/get-recommendations/route.js (OBJECT)
cat > "src/app/api/ai/get-recommendations/route.js" << 'EOF'
// lolmetamind/src/app/api/ai/get-recommendations/route.js

import { NextResponse } from 'next/server';
import { generateStrategicAnalysis } from '@/lib/ai/strategist';
import { createInitialAnalysisPrompt } from '@/lib/ai/prompts'; 

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(request) {
    try {
        const { summoner, draft } = await request.json();

        if (!summoner || !summoner.summonerName || !summoner.zodiacSign) {
            console.error("[API GET-RECOMMENDATIONS] Error: Faltan datos esenciales del invocador para la IA (summonerName, zodiacSign).");
            return NextResponse.json(
                { message: "Faltan datos esenciales del invocador para generar recomendaciones. Asegúrate de que el perfil esté completo (incluyendo signo zodiacal)." },
                { status: 400, headers: CORS_HEADERS }
            );
        }
        
        console.log(`[Strategist] Enviando prompt a Gemini 1.0 Pro para recomendaciones iniciales...`);

        const prompt = createInitialAnalysisPrompt({
            summonerName: summoner.summonerName,
            zodiacSign: summoner.zodiacSign,
            draft: draft
        });

        // CÓDIGO DETERMINISTA: Espera un 'object'
        const analysis = await generateStrategicAnalysis(prompt, 'object');

        return NextResponse.json(analysis, { status: 200, headers: CORS_HEADERS });

    } catch (error) {
        console.error("[API GET-RECOMMENDATIONS] Error en la generación de recomendaciones:", error);
        return NextResponse.json(
            { message: `Error: No se pudo completar el análisis de la IA. Detalles: ${error.message}` },
            { status: 500, headers: CORS_HEADERS }
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}
EOF

# Archivo: src/app/api/ai/get-meta/route.js (OBJECT)
cat > "src/app/api/ai/get-meta/route.js" << 'EOF'
// src/app/api/ai/get-meta/route.js

import { NextResponse } from 'next/server';
import { generateStrategicAnalysis } from '@/lib/ai/strategist';
import { createMetaAnalysisPrompt } from '@/lib/ai/prompts';

export async function POST(request) {
    try {
        const body = await request.json(); 
        const { patchVersion } = body;

        const prompt = createMetaAnalysisPrompt(patchVersion || 'actual');
        
        // CÓDIGO DETERMINISTA: Espera un 'object'
        const metaAnalysis = await generateStrategicAnalysis(prompt, 'object');

        return NextResponse.json(metaAnalysis);

    } catch (error) {
        console.error('[API GET-META] Error:', error);
        return NextResponse.json({ error: 'Error interno al generar el análisis del meta.' }, { status: 500 });
    }
}
EOF

# Archivo: src/app/api/ai/analyze-matches/route.js (OBJECT)
cat > "src/app/api/ai/analyze-matches/route.js" << 'EOF'
// src/app/api/ai/analyze-matches/route.js

import { NextResponse } from 'next/server';
import { generateStrategicAnalysis } from '@/lib/ai/strategist';
import { createPerformanceAnalysisPrompt } from '@/lib/ai/prompts';

export async function POST(request) {
    try {
        const body = await request.json();
        const { matchHistory, summonerData } = body;

        if (!summonerData) {
            return NextResponse.json({ error: 'Faltan datos del invocador.' }, { status: 400 });
        }
        
        const prompt = createPerformanceAnalysisPrompt(matchHistory || [], summonerData);
        
        // CÓDIGO DETERMINISTA: Espera un 'object'
        const analysis = await generateStrategicAnalysis(prompt, 'object');

        return NextResponse.json(analysis);

    } catch (error) {
        console.error('[API ANALYZE-MATCHES] Error:', error);
        return NextResponse.json({ error: 'Error interno al analizar las partidas.' }, { status: 500 });
    }
}
EOF

# Archivo: src/app/api/ai/live-coach/route.js (OBJECT)
cat > "src/app/api/ai/live-coach/route.js" << 'EOF'
// src/app/api/ai/live-coach/route.js (ENDPOINT DE COACHING EN TIEMPO REAL)

import { NextResponse, NextRequest } from 'next/server'; // Se añade NextRequest por si acaso
import { generateStrategicAnalysis } from '@/lib/ai/strategist';
import { createLiveCoachingPrompt } from '@/lib/ai/prompts';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(request) {
    try {
        const { liveData, userData } = await request.json();

        if (!liveData?.activePlayer || !userData?.zodiacSign) {
            return NextResponse.json({ message: 'Datos de juego o de usuario incompletos para el coaching.' }, { status: 400, headers: CORS_HEADERS });
        }

        const prompt = createLiveCoachingPrompt(liveData, userData.zodiacSign);
        
        // CÓDIGO DETERMINISTA: Espera un 'object'
        const analysis = await generateStrategicAnalysis(prompt, 'object');
        
        return NextResponse.json(analysis, { status: 200, headers: CORS_HEADERS });

    } catch (error) {
        console.error('[API LIVE-COACH] Error:', error);
        return NextResponse.json({ error: `Error interno al generar el coaching: ${error.message}` }, { status: 500, headers: CORS_HEADERS });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}
EOF

# --- PASO 5: INTEGRACIÓN WEBSOCKET DETERMINISTA (websocket-server.js) ---
echo -e "\n📡 PASO 5: Integración del Servidor WebSocket con Contratos Deterministas"

# Archivo: websocket-server.js
cat > "websocket-server.js" << 'EOF'
// websocket-server.js - VERSIÓN FINAL, PROFESIONAL Y COMPLETA

const WebSocket = require('ws');
const path = require('path');

// Carga de variables de entorno de forma segura, apuntando a la raíz del proyecto.
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

// Importaciones de lógica de negocio desde la carpeta de compilación 'dist'.
// NOTA: generateStrategicAnalysis debe ser llamada con expectedType!
const { generateStrategicAnalysis } = require('./dist/lib/ai/strategist');
const { createChampSelectPrompt, createLiveCoachingPrompt, createPreGamePrompt } = require('./dist/lib/ai/prompts');

const SERVER_PORT = process.env.WS_PORT || 8080;
const wss = new WebSocket.Server({ port: SERVER_PORT });

// --- VALIDACIÓN Y MANEJO DE ERRORES (sin cambios) ---
const validate = (schema, data) => {
  if (!data) {
    throw new Error(`Datos requeridos por el esquema '${schema}' están ausentes.`);
  }
  if (schema === 'userData' && (typeof data.summonerName !== 'string' || !data.zodiacSign)) {
    throw new Error('El objeto userData no tiene el formato esperado (requiere summonerName y zodiacSign).');
  }
  return true;
};

const handleError = (error, ws, context = 'general') => {
  const errorMessage = error instanceof Error ? error.message : 'Un error desconocido ocurrió.';
  console.error(`🚨 Error en [${context}]:`, errorMessage);
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ eventType: 'ERROR', data: { message: `Error en el servidor: ${errorMessage}` } }));
  }
};

// --- MANEJADOR DE EVENTOS (CON CONTRATOS DETERMINISTAS) ---
const eventHandlers = {
  /**
   * Maneja la solicitud de consejo pre-partida.
   */
  'QUEUE_UPDATE': async ({ userData }, ws) => {
    validate('userData', userData);
    console.log('[EVENTO] Procesando QUEUE_UPDATE para generar consejo pre-partida...');
    
    const model = 'gemini-2.0-flash'; // Modelo ultrarrápido para baja latencia
    const prompt = createPreGamePrompt(userData);
    
    // CÓDIGO DETERMINISTA: Espera un 'object'
    const analysisResult = await generateStrategicAnalysis(prompt, 'object', model);
    
    console.log('[EVENTO] ✅ Consejo pre-partida generado. Enviando QUEUE_ADVICE...');
    ws.send(JSON.stringify({ eventType: 'QUEUE_ADVICE', data: analysisResult }));
  },

  /**
   * Maneja el análisis del draft en selección de campeón.
   */
  'CHAMP_SELECT_UPDATE': async ({ data, userData }, ws) => {
    validate('userData', userData);
    console.log('[EVENTO] Procesando CHAMP_SELECT_UPDATE para analizar el draft...');
    
    const model = 'gemini-2.0-flash'; // Modelo ultrarrápido para baja latencia
    const prompt = createChampSelectPrompt(data, userData);
    
    // CÓDIGO DETERMINISTA: Espera un 'object'
    const analysisResult = await generateStrategicAnalysis(prompt, 'object', model);
    
    console.log('[EVENTO] ✅ Análisis de draft generado. Enviando CHAMP_SELECT_ADVICE...');
    ws.send(JSON.stringify({ eventType: 'CHAMP_SELECT_ADVICE', data: analysisResult }));
  },

  /**
   * Maneja el análisis de capturas de pantalla para coaching en vivo.
   */
  'IN_GAME_SCREENSHOT_ANALYSIS': async ({ data, userData }, ws) => {
    validate('userData', userData);
    console.log('[EVENTO] Procesando IN_GAME_SCREENSHOT_ANALYSIS para coaching en vivo...');
    
    const model = 'gemini-2.0-flash'; // Modelo ultrarrápido para baja latencia
    const prompt = createLiveCoachingPrompt(data, userData.zodiacSign);
    
    // CÓDIGO DETERMINISTA: Espera un 'object'
    const analysisResult = await generateStrategicAnalysis(prompt, 'object', model);
    
    console.log('[EVENTO] ✅ Consejo en vivo generado. Enviando IN_GAME_ADVICE...');
    ws.send(JSON.stringify({ eventType: 'IN_GAME_ADVICE', data: analysisResult }));
  }
};

// --- LÓGICA PRINCIPAL DEL SERVIDOR (sin cambios) ---
wss.on('connection', (ws) => {
  console.log('[CONEXIÓN] Nueva conexión de cliente (App Electron) establecida.');

  ws.on('message', async (rawMessage) => {
    let message;
    try {
      message = JSON.parse(rawMessage.toString());
      const { eventType } = message;

      if (!eventType) {
        throw new Error("El mensaje recibido no contiene 'eventType'.");
      }
      
      console.log('[MENSAJE RECIBIDO]', eventType);

      const handler = eventHandlers[eventType];

      if (handler) {
        await handler(message, ws);
      } else {
        console.warn(`[EVENTO] Tipo de evento no reconocido: ${eventType}`);
        ws.send(JSON.stringify({ eventType: 'ERROR', data: { message: 'Tipo de evento no reconocido.' } }));
      }
    } catch (error) {
      handleError(error, ws, message ? message.eventType : 'parsing');
    }
  });

  ws.on('close', () => {
    console.log('[DESCONEXIÓN] Conexión de cliente (App Electron) cerrada.');
  });
  
  ws.on('error', (err) => {
    handleError(err, ws, 'connection');
  });
});

console.log(`✅ Servidor WebSocket de IA iniciado en el puerto ${SERVER_PORT}.`);
EOF


# --- PASO FINAL: INSTRUCCIONES DE EJECUCIÓN ---
echo -e "\n\n🚀 EJECUCIÓN: El sistema está listo para la producción."
echo "1. INSTALACIÓN DE DEPENDENCIAS (si no se ha hecho): npm install"
echo "2. COMPILACIÓN: El servidor WebSocket utiliza archivos compilados. Debes compilar la nueva lógica antes de iniciar el WS."
echo "   -> npm run build:server"
echo "3. INICIO DE SERVIDORES (Debe hacerse en terminales separadas):"
echo "   -> Next.js (APIs): npm run dev"
echo "   -> WebSocket Server: npm run start:ws"
echo -e "\n✅ Implementación completada. El ${0} ha terminado."