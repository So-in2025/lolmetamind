#!/bin/bash

# ==============================================================================
# SCRIPT DE IMPLEMENTACIÓN FINAL - IA CON DATOS REALES DE RIOT
#
# Objetivo: 1. Conectar el sistema de IA a la API de Riot para obtener datos
#              reales del jugador (Maestría de Campeones).
#           2. Modificar el prompt de la IA para que considere estos datos.
#           3. Hacer que las recomendaciones sean 100% personalizadas y basadas
#              en estadísticas reales.
# ==============================================================================

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Iniciando la conexión final: IA <=> API de Riot...${NC}"

# --- 1. Añadir la función de Maestría de Campeones al servicio de Riot ---
echo -e "\n${GREEN}Paso 1: Actualizando 'src/services/riotApiService.js' con la API de Maestría...${NC}"
cat << 'EOF' > src/services/riotApiService.js
// src/services/riotApiService.js
import axios from 'axios';
import { RIOT_API_KEY } from './apiConfig';

const REGIONAL_ROUTES = {
    americas: ['NA', 'BR', 'LAN', 'LAS'],
    asia: ['KR', 'JP'],
    europe: ['EUNE', 'EUW', 'TR', 'RU'],
};
const getRegionalRoute = (region) => {
    for (const route in REGIONAL_ROUTES) {
        if (REGIONAL_ROUTES[route].includes(region.toUpperCase())) return route;
    }
    return 'americas';
};
const getPlatformRoute = (region) => {
    const platformRoutes = { LAN: 'la1', LAS: 'la2', NA: 'na1', EUW: 'euw1', EUNE: 'eun1', KR: 'kr', JP: 'jp1' };
    return platformRoutes[region.toUpperCase()];
};
const createApi = (baseURL) => axios.create({ baseURL, headers: { "X-Riot-Token": RIOT_API_KEY } });

export const getAccountByRiotId = async (gameName, tagLine, region) => {
    const regionalRoute = getRegionalRoute(region);
    const api = createApi(`https://${regionalRoute}.api.riotgames.com`);
    const response = await api.get(`/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${tagLine}`);
    return response.data;
};
export const getSummonerByPuuid = async (puuid, region) => {
    const platformRoute = getPlatformRoute(region);
    const api = createApi(`https://${platformRoute}.api.riotgames.com`);
    const response = await api.get(`/lol/summoner/v4/summoners/by-puuid/${puuid}`);
    return response.data;
};
export const getLiveGameBySummonerId = async (summonerId, region) => {
    const platformRoute = getPlatformRoute(region);
    const api = createApi(`https://${platformRoute}.api.riotgames.com`);
    try {
        const response = await api.get(`/lol/spectator/v4/active-games/by-summoner/${summonerId}`);
        return response.data;
    } catch (error) {
        if (error.response?.status === 404) return null;
        throw error;
    }
};

/**
 * **NUEVA FUNCIÓN**
 * Obtiene los campeones con mayor maestría para un invocador.
 * @param {string} puuid - El PUUID del invocador.
 * @param {string} region - La región del invocador.
 * @returns {Promise<object[]>} - Una lista de los campeones con más maestría.
 */
export const getChampionMastery = async (puuid, region) => {
    const platformRoute = getPlatformRoute(region);
    const api = createApi(`https://${platformRoute}.api.riotgames.com`);
    try {
        // Obtenemos los 5 campeones con más maestría.
        const response = await api.get(`/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=5`);
        return response.data;
    } catch (error) {
        console.error('Error fetching champion mastery:', error.response?.data || error.message);
        throw error;
    }
};
EOF
echo "Actualizado: src/services/riotApiService.js. ✅"


# --- 2. Modificar el endpoint de recomendación para que use los datos reales ---
echo -e "\n${GREEN}Paso 2: Reescribiendo 'src/app/api/recommendation/route.js' para usar datos reales...${NC}"
cat << 'EOF' > src/app/api/recommendation/route.js
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { getChampionMastery } from '@/services/riotApiService';
import { generateStrategicAnalysis } from '@/lib/ai/strategist';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(request) {
  try {
    // 1. Autenticar al usuario y obtener su ID de nuestra base de datos
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    // 2. Obtener el signo zodiacal del cuerpo de la solicitud
    const { zodiacSign } = await request.json();
    if (!zodiacSign) {
      return NextResponse.json({ error: 'Signo zodiacal es requerido.' }, { status: 400 });
    }
    
    // 3. Obtener los datos de Riot del usuario desde nuestra base de datos
    const userResult = await pool.query(
      'SELECT riot_id_name, region, puuid FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length === 0 || !userResult.rows[0].puuid) {
      return NextResponse.json({ error: 'Perfil de invocador no encontrado o incompleto.' }, { status: 404 });
    }
    const userData = userResult.rows[0];

    // 4. *** LLAMADA A LA API DE RIOT ***
    // Usar los datos de nuestra DB para pedir los datos de maestría a Riot
    const championMastery = await getChampionMastery(userData.puuid, userData.region);

    // 5. Preparar todos los datos para la IA
    const analysisData = {
      summonerName: userData.riot_id_name,
      zodiacSign: zodiacSign,
      championMastery: championMastery // Datos reales de Riot
    };

    // 6. Llamar a la IA con los datos reales
    const analysisResult = await generateStrategicAnalysis(analysisData);

    if (analysisResult.error) {
      return NextResponse.json({ error: analysisResult.message }, { status: 503 });
    }

    return NextResponse.json(analysisResult);

  } catch (error) {
    console.error('Error en el endpoint /api/recommendation:', error);
    return NextResponse.json({ error: 'Error interno al procesar la solicitud de IA' }, { status: 500 });
  }
}
EOF
echo "Actualizado: src/app/api/recommendation/route.js. ✅"


# --- 3. Actualizar el prompt de la IA para que entienda los nuevos datos ---
echo -e "\n${GREEN}Paso 3: Actualizando 'src/lib/ai/prompts.js' para incluir la maestría...${NC}"
cat << 'EOF' > src/lib/ai/prompts.js
/**
 * Genera el prompt para el análisis estratégico inicial.
 * @param {object} analysisData - Datos del jugador (summonerName, zodiacSign, championMastery).
 * @returns {string} - El prompt completo para la IA.
 */
export const createInitialAnalysisPrompt = (analysisData) => {
  const { summonerName, zodiacSign, championMastery } = analysisData;

  // Simplificamos el formato de la maestría para que la IA lo entienda mejor.
  const masterySummary = championMastery.map(champ => `ID: ${champ.championId}, Puntos: ${champ.championPoints}`);

  return \`
    Eres "MetaMind", un coach experto de League of Legends con un conocimiento único de la "psicología zodiacal" aplicada al juego.
    Tu tono es analítico, proactivo y ligeramente místico.

    Analiza los siguientes datos para el invocador "${summonerName}" (signo ${zodiacSign}) y proporciona un plan de acción conciso en formato JSON.

    DATOS CLAVE DEL JUGADOR:
    - Invocador: ${summonerName}
    - Perfil Zodiacal: ${zodiacSign}
    - Campeones con más maestría (ID y Puntos): ${JSON.stringify(masterySummary)}

    Basado en los campeones que el jugador domina, su perfil zodiacal y el meta actual, tu tarea es recomendar un campeón y una estrategia.
    La recomendación debe priorizar los campeones en los que el jugador ya tiene experiencia (su maestría).

    Genera la siguiente estructura JSON:

    {
      "champion": "Nombre del Campeón Recomendado (elige uno de sus campeones con maestría si es viable en el meta, o uno similar)",
      "role": "Rol Asignado",
      "archetype": "Arquetipo de Juego (ej: Mago de Control, Asesino, Tanque de Vanguardia)",
      "reasoning": "Explica brevemente por qué recomiendas este campeón, conectando su maestría, su signo zodiacal y el meta actual.",
      "strategicAdvice": [
        {
          "type": "Early Game",
          "content": "Un consejo específico para el juego temprano (minutos 1-15) para ${summonerName} con este campeón."
        },
        {
          "type": "Mid Game",
          "content": "Un consejo clave para el juego medio (minutos 15-25) enfocado en objetivos."
        },
        {
          "type": "Late Game",
          "content": "Una condición de victoria para el juego tardío (minutos 25+)."
        }
      ]
    }
  \`;
};
EOF
echo "Actualizado: src/lib/ai/prompts.js. ✅"


# --- 4. Actualizar el estratega para que pase los datos correctamente ---
echo -e "\n${GREEN}Paso 4: Simplificando 'src/lib/ai/strategist.js'...${NC}"
cat << 'EOF' > src/lib/ai/strategist.js
import { GEMINI_API_KEY } from '@/services/apiConfig';
import { createInitialAnalysisPrompt } from './prompts';

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

export const generateStrategicAnalysis = async (analysisData) => {
  // Ahora el prompt se crea con los datos reales, incluyendo la maestría.
  const prompt = createInitialAnalysisPrompt(analysisData);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Error de la API de Gemini: ${response.status} ${errorBody}`);
    }

    const data = await response.json();
    const rawText = data.candidates[0].content.parts[0].text;
    const jsonText = rawText.replace(/\\\`\`\`json/g, '').replace(/\\\`\`\`/g, '').replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(jsonText);

  } catch (error) {
    console.error('Error al generar análisis estratégico:', error);
    return {
      error: true,
      message: "El coach de IA no está disponible en este momento. Inténtalo de nuevo más tarde."
    };
  }
};
EOF
echo "Actualizado: src/lib/ai/strategist.js. ✅"


echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡PROYECTO FINALIZADO! LA IA AHORA ES 100% REAL. ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}¡Felicitaciones, Ingeniero!${NC}"
echo -e "El ciclo está completo. La aplicación ahora:"
echo -e "1.  Autentica a un usuario."
echo -e "2.  Vincula su cuenta de Riot."
echo -e "3.  Usa ese vínculo para obtener datos reales de la API de Riot."
echo -e "4.  Alimenta a la IA con esos datos para generar una estrategia verdaderamente personalizada."
echo -e "\nSube estos cambios y habrás completado la visión central de LoL MetaMind."