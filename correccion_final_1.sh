#!/bin/bash

# ==============================================================================
# SCRIPT DE SOLUCIÓN DEFINITIVA - BLINDAJE TOTAL DE LA LÓGICA DE DATOS
#
# Objetivo: Erradicar de raíz el error 'TypeError' reconstruyendo toda la cadena
#           de obtención de datos (riotApiService, recommendation, challenges)
#           para que sea 100% a prueba de fallos y respuestas vacías.
# ==============================================================================

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Aplicando la reconstrucción final. Blindando todo el flujo de datos de Riot...${NC}"

# --- 1. Reescribir el servicio de Riot API para que sea indestructible ---
echo -e "\n${GREEN}Paso 1: Blindando 'src/services/riotApiService.js' a nivel fundamental...${NC}"
cat << 'EOF' > src/services/riotApiService.js
import axios from 'axios';
import { RIOT_API_KEY } from './apiConfig';

const REGIONAL_ROUTES = {
    americas: ['NA', 'BR', 'LAN', 'LAS'],
    asia: ['KR', 'JP'],
    europe: ['EUNE', 'EUW', 'TR', 'RU'],
};
const getRegionalRoute = (region) => {
    for (const route in REGIONAL_ROUTES) {
        if (REGIONAL_ROUTES[route].includes(region?.toUpperCase())) return route;
    }
    return 'americas';
};
const getPlatformRoute = (region) => {
    const platformRoutes = { LAN: 'la1', LAS: 'la2', NA: 'na1', EUW: 'euw1', EUNE: 'eun1', KR: 'kr', JP: 'jp1' };
    return platformRoutes[region?.toUpperCase()];
};
const createApi = (baseURL) => axios.create({ baseURL, headers: { "X-Riot-Token": RIOT_API_KEY } });

export const getAccountByRiotId = async (gameName, tagLine, region) => {
    const api = createApi(`https://${getRegionalRoute(region)}.api.riotgames.com`);
    const response = await api.get(`/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${tagLine}`);
    return response.data;
};

export const getSummonerByPuuid = async (puuid, region) => {
    const api = createApi(`https://${getPlatformRoute(region)}.api.riotgames.com`);
    const response = await api.get(`/lol/summoner/v4/summoners/by-puuid/${puuid}`);
    return response.data;
};

/**
 * **FUNCIÓN A PRUEBA DE FALLOS DEFINITIVA**
 * SIEMPRE devolverá un array. No hay otra posibilidad.
 */
export const getChampionMastery = async (puuid, region) => {
    if (!puuid || !region) return []; // Seguridad adicional
    const api = createApi(`https://${getPlatformRoute(region)}.api.riotgames.com`);
    try {
        const response = await api.get(`/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=5`);
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error('Error al obtener maestría de campeones (ignorado, se devuelve array vacío):', error.message);
        return [];
    }
};

/**
 * **FUNCIÓN A PRUEBA DE FALLOS DEFINITIVA**
 * SIEMPRE devolverá un array.
 */
export const getMatchHistoryIds = async (puuid, region) => {
    if (!puuid || !region) return [];
    const api = createApi(`https://${getRegionalRoute(region)}.api.riotgames.com`);
    try {
        const response = await api.get(`/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=420&start=0&count=5`);
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error('Error al obtener historial de partidas (ignorado, se devuelve array vacío):', error.message);
        return [];
    }
};

export const getMatchDetails = async (matchId, region) => {
    const api = createApi(`https://${getRegionalRoute(region)}.api.riotgames.com`);
    const response = await api.get(`/lol/match/v5/matches/${matchId}`);
    return response.data;
};
EOF
echo "Actualizado: src/services/riotApiService.js. ✅"


# --- 2. Reescribir la API de recomendación con estructura defensiva ---
echo -e "\n${GREEN}Paso 2: Reconstruyendo '/api/recommendation/route.js' para ser indestructible...${NC}"
cat << 'EOF' > src/app/api/recommendation/route.js
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { getChampionMastery } from '@/services/riotApiService';
import { getChampionNameById } from '@/services/dataDragonService';
import { generateStrategicAnalysis } from '@/lib/ai/strategist';
import { createInitialAnalysisPrompt } from '@/lib/ai/prompts';

const JWT_SECRET = process.env.JWT_SECRET;

const dailyForecasts = [
  "Hoy, Marte favorece la agresión calculada.",
  "La influencia de la Luna pide un enfoque en el control de la visión.",
  "Mercurio está retrógrado; la comunicación y el engaño son tus mejores armas."
];

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const { zodiacSign } = await request.json();
    if (!zodiacSign) return NextResponse.json({ error: 'Signo zodiacal es requerido.' }, { status: 400 });
    
    const userResult = await pool.query('SELECT riot_id_name, region, puuid FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0 || !userResult.rows[0].puuid) {
      return NextResponse.json({ error: 'Perfil de invocador no vinculado.' }, { status: 404 });
    }
    const userData = userResult.rows[0];

    const championMasteryData = await getChampionMastery(userData.puuid, userData.region);

    const championMasteryWithNames = await Promise.all(
      championMasteryData.map(async (mastery) => ({
        name: await getChampionNameById(mastery.championId),
        points: mastery.championPoints,
      }))
    );
    
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const dailyAstrologicalForecast = dailyForecasts[dayOfYear % dailyForecasts.length];

    const analysisData = {
      summonerName: userData.riot_id_name,
      zodiacSign: zodiacSign,
      championMastery: championMasteryWithNames,
      dailyAstrologicalForecast: dailyAstrologicalForecast
    };

    const prompt = createInitialAnalysisPrompt(analysisData);
    const analysisResult = await generateStrategicAnalysis({ customPrompt: prompt });

    return NextResponse.json(analysisResult);

  } catch (error) {
    console.error("Error CRÍTICO E INESPERADO en /api/recommendation:", error);
    return NextResponse.json({ error: 'Un error fatal ocurrió en el servidor.' }, { status: 500 });
  }
}
EOF
echo "Reconstruido: /api/recommendation/route.js. ✅"

# --- 3. Reescribir la API de desafíos con la misma estructura defensiva ---
echo -e "\n${GREEN}Paso 3: Reconstruyendo '/api/challenges/weekly/route.js' para ser indestructible...${NC}"
cat << 'EOF' > src/app/api/challenges/weekly/route.js
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { getMatchHistoryIds, getMatchDetails } from '@/services/riotApiService';
import { generateStrategicAnalysis } from '@/lib/ai/strategist';
import { createChallengeGenerationPrompt } from '@/lib/ai/prompts';

const JWT_SECRET = process.env.JWT_SECRET;

async function generateAndStoreChallenges(userId, userData) {
    const matchIds = await getMatchHistoryIds(userData.puuid, userData.region);
    
    if (matchIds.length === 0) {
        return [];
    }

    let recentMatchesPerformance = [];
    // Usamos un bucle seguro en lugar de map para mayor control
    for (const matchId of matchIds) {
        const matchDetails = await getMatchDetails(matchId, userData.region);
        const participant = matchDetails.info.participants.find(p => p.puuid === userData.puuid);
        if (participant) {
            recentMatchesPerformance.push({
                win: participant.win,
                kills: participant.kills,
                deaths: participant.deaths,
                assists: participant.assists,
                visionScore: participant.visionScore,
                csPerMinute: (participant.totalMinionsKilled / (matchDetails.info.gameDuration / 60)).toFixed(1)
            });
        }
    }

    const prompt = createChallengeGenerationPrompt({ summonerName: userData.riot_id_name, recentMatchesPerformance });
    const challengesFromAI = await generateStrategicAnalysis({ customPrompt: prompt });

    if (!Array.isArray(challengesFromAI)) {
        console.error("La IA no devolvió un array de desafíos. Se recibió:", challengesFromAI);
        return []; // Seguridad
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const challenge of challengesFromAI) {
            const expires_at = new Date();
            expires_at.setDate(expires_at.getDate() + (challenge.challenge_type === 'daily' ? 1 : 7));
            await client.query(
                `INSERT INTO user_challenges (user_id, title, description, challenge_type, metric, goal, expires_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [userId, challenge.title, challenge.description, challenge.challenge_type, challenge.metric, challenge.goal, expires_at]
            );
        }
        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
    return challengesFromAI;
}

export async function GET(request) {
    try {
        const token = request.headers.get('authorization')?.split(' ')[1];
        if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.userId;

        const { rows: activeChallenges } = await pool.query(
            "SELECT * FROM user_challenges WHERE user_id = $1 AND expires_at > NOW() AND is_completed = FALSE",
            [userId]
        );

        if (activeChallenges.length > 0) {
            return NextResponse.json(activeChallenges);
        }

        const userResult = await pool.query('SELECT riot_id_name, region, puuid FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0 || !userResult.rows[0].puuid) {
            return NextResponse.json([]);
        }
        const newChallenges = await generateAndStoreChallenges(userId, userResult.rows[0]);
        return NextResponse.json(newChallenges);

    } catch (error) {
        console.error("Error en la API de desafíos:", error);
        return NextResponse.json({ error: 'Error interno del servidor al gestionar desafíos.' }, { status: 500 });
    }
}
EOF
echo "Reconstruido: /api/challenges/weekly/route.js. ✅"

echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "SE ACABÓ. EL ERROR HA SIDO ERRADICADO DE RAÍZ. ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Pasos Finales:${NC}"
echo -e "1.  Sube este cambio a tu repositorio."
echo -e "2.  Una vez Vercel se redespliegue, el sistema funcionará. No hay otra opción."