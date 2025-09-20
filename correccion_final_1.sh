#!/bin/bash

# ==============================================================================
# SCRIPT DE CORRECCIÓN INTEGRAL PARA DESPLIEGUE EN VERCEL
#
# Objetivo: Solucionar de forma definitiva el error "Dynamic server usage"
#           asegurando que todas las rutas de API que usan datos dinámicos
#           sean tratadas como tal por Next.js.
# ==============================================================================

# --- Colores para una mejor visualización ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # Sin color

echo -e "${YELLOW}Aplicando correcciones para el despliegue de Next.js en Vercel...${NC}"

# --- 1. Corregir /api/challenges/weekly/route.js ---
echo -e "\n${CYAN}Paso 1: Aplicando parche a '/api/challenges/weekly/route.js'...${NC}"
cat << 'EOF' > src/app/api/challenges/weekly/route.js
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { getMatchHistoryIds, getMatchDetails } from '@/services/riotApiService';
import { generateStrategicAnalysis } from '@/lib/ai/strategist';
import { createChallengeGenerationPrompt } from '@/lib/ai/prompts';

const JWT_SECRET = process.env.JWT_SECRET;

// SOLUCIÓN: Forzar el renderizado dinámico para esta ruta
export const dynamic = 'force-dynamic';

async function generateAndStoreChallenges(userId, userData) {
    const matchIds = await getMatchHistoryIds(userData.puuid, userData.region);
    
    if (matchIds.length === 0) {
        return [];
    }

    let recentMatchesPerformance = [];
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
        return [];
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
echo -e "${GREEN}Éxito. La ruta ahora es dinámica. ✅${NC}"

# --- 2. Corregir /api/recommendation/route.js (Preventivo) ---
echo -e "\n${CYAN}Paso 2: Aplicando parche preventivo a '/api/recommendation/route.js'...${NC}"
cat << 'EOF' > src/app/api/recommendation/route.js
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { getChampionMastery } from '@/services/riotApiService';
import { getChampionNameById } from '@/services/dataDragonService';
import { generateStrategicAnalysis } from '@/lib/ai/strategist';
import { createInitialAnalysisPrompt } from '@/lib/ai/prompts';

const JWT_SECRET = process.env.JWT_SECRET;

// SOLUCIÓN: Forzar el renderizado dinámico para esta ruta
export const dynamic = 'force-dynamic';

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
echo -e "${GREEN}Éxito. La ruta ahora es dinámica. ✅${NC}"

# --- 3. Corregir /api/user/profile/route.js (Preventivo) ---
echo -e "\n${CYAN}Paso 3: Aplicando parche preventivo a '/api/user/profile/route.js'...${NC}"
cat << 'EOF' > src/app/api/user/profile/route.js
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { getAccountByRiotId, getSummonerByPuuid } from '@/services/riotApiService';

const JWT_SECRET = process.env.JWT_SECRET;

// SOLUCIÓN: Forzar el renderizado dinámico para esta ruta
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const { gameName, tagLine, region } = await request.json();
    if (!gameName || !tagLine || !region) {
      return NextResponse.json({ error: 'Nombre de juego, tagline y región son requeridos' }, { status: 400 });
    }

    const accountData = await getAccountByRiotId(gameName, tagLine, region);
    const { puuid } = accountData;

    const summonerData = await getSummonerByPuuid(puuid, region);
    const { id: summoner_id } = summonerData;

    const existingLink = await pool.query('SELECT id FROM users WHERE puuid = $1 AND id != $2', [puuid, userId]);
    if (existingLink.rows.length > 0) {
      return NextResponse.json({ error: 'Este Riot ID ya está vinculado a otra cuenta de LoL MetaMind.' }, { status: 409 });
    }

    const result = await pool.query(
      `UPDATE users 
       SET riot_id_name = $1, riot_id_tagline = $2, region = $3, puuid = $4, summoner_id = $5, updated_at = NOW() 
       WHERE id = $6 
       RETURNING id, username, email, riot_id_name, riot_id_tagline, region`,
      [gameName, tagLine, region, puuid, summoner_id, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado en nuestra base de datos' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Perfil actualizado con éxito', user: result.rows[0] });

  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Este Riot ID ya está vinculado a otra cuenta.' }, { status: 409 });
    }
    if (error.response?.status === 404) {
      return NextResponse.json({ error: `Riot ID no encontrado. Verifica el nombre, tagline y región.` }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error interno del servidor al procesar la solicitud.' }, { status: 500 });
  }
}
EOF
echo -e "${GREEN}Éxito. La ruta ahora es dinámica. ✅${NC}"

# --- 4. Corregir /api/challenges/progress/route.js (Preventivo) ---
echo -e "\n${CYAN}Paso 4: Aplicando parche preventivo a '/api/challenges/progress/route.js'...${NC}"
cat << 'EOF' > src/app/api/challenges/progress/route.js
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { getMatchHistoryIds, getMatchDetails } from '@/services/riotApiService';

const JWT_SECRET = process.env.JWT_SECRET;

// SOLUCIÓN: Forzar el renderizado dinámico para esta ruta
export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const token = request.headers.get('authorization')?.split(' ')[1];
        if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.userId;

        const userResult = await pool.query('SELECT puuid, region FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0 || !userResult.rows[0].puuid) {
            return NextResponse.json({ error: 'Perfil de Riot no vinculado.' }, { status: 404 });
        }
        const { puuid, region } = userResult.rows[0];

        const matchIds = await getMatchHistoryIds(puuid, region);
        if (matchIds.length === 0) {
            return NextResponse.json({ message: "No se encontraron partidas recientes." });
        }
        const lastMatchId = matchIds[0];
        const matchDetails = await getMatchDetails(lastMatchId, region);
        const participant = matchDetails.info.participants.find(p => p.puuid === puuid);

        if (!participant) {
            return NextResponse.json({ error: "No se encontraron datos del jugador en la última partida." }, { status: 404 });
        }

        const { rows: activeChallenges } = await pool.query(
            "SELECT * FROM user_challenges WHERE user_id = $1 AND expires_at > NOW() AND is_completed = FALSE",
            [userId]
        );

        let updates = [];
        for (const challenge of activeChallenges) {
            let progressMade = 0;
            const metric = challenge.metric;

            if (metric === 'csPerMinute') {
                progressMade = (participant.totalMinionsKilled / (matchDetails.info.gameDuration / 60));
            } else if (participant.hasOwnProperty(metric)) {
                progressMade = participant[metric];
            }

            const newProgress = Math.min(challenge.goal, challenge.progress + progressMade);
            const isCompleted = newProgress >= challenge.goal;

            await pool.query(
                "UPDATE user_challenges SET progress = $1, is_completed = $2 WHERE id = $3",
                [newProgress, isCompleted, challenge.id]
            );
            updates.push({ title: challenge.title, newProgress, isCompleted });
        }

        return NextResponse.json({ message: "Progreso de desafíos actualizado.", updates });

    } catch (error) {
        console.error("Error al procesar progreso:", error);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
EOF
echo -e "${GREEN}Éxito. La ruta ahora es dinámica. ✅${NC}"

echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡TODO LISTO! El script ha parcheado todas las rutas problemáticas. ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Pasos Finales:${NC}"
echo -e "1. Ejecuta este script en tu terminal con: ${GREEN}bash fix_deployment_errors.sh${NC}"
echo -e "2. Sube los cambios a tu repositorio de Git."
echo -e "3. Vercel se redesplegará automáticamente y el error debería estar solucionado."