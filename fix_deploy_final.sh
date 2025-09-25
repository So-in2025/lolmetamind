#!/bin/bash

echo "APLICANDO FIX CRÍTICO FINAL: Forzando rutas dinámicas (Vercel) y asegurando la autenticación JWT (Login Flow)..."

# --- FIX 1: src/app/api/user/me/route.js (Dynamic Route, Auth JWT) ---
echo "1. Corrigiendo src/app/api/user/me/route.js..."
cat > src/app/api/user/me/route.js << 'EOL'
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import db from '@/lib/db'; 

const JWT_SECRET = process.env.JWT_SECRET;
export const dynamic = 'force-dynamic'; // SOLUCIONA EL ERROR DE VERCEL (request.headers)

export async function GET(req) {
    try {
        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.userId;

        const userResult = await db.query(
            'SELECT id, username, email, avatar_url, license_key, subscription_tier, trial_ends_at, riot_id_name, riot_id_tagline, region, puuid FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }
        
        return NextResponse.json(userResult.rows[0]);

    } catch (error) {
        console.error('Error al obtener los datos del usuario:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
EOL

# --- FIX 2: src/app/api/activate-trial/route.js (Dynamic Route) ---
echo "2. Corrigiendo src/app/api/activate-trial/route.js..."
cat > src/app/api/activate-trial/route.js << 'EOL'
import { NextResponse } from 'next/server';
import db from '@/lib/db'; 
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
export const dynamic = 'force-dynamic'; // Necesario para rutas con JWT/Headers

export async function POST(req) {
    try {
        const token = req.headers.get('authorization')?.split(' ')[1]; 
        if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.userId;

        const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
        const user = userResult.rows[0];

        if (!user) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }
        
        if (user.subscription_tier !== 'FREE' || user.trial_ends_at) {
            return NextResponse.json({ error: 'Este usuario no es elegible para una prueba.' }, { status: 403 });
        }

        const trialEndDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        await db.query(
            'UPDATE users SET "subscription_tier" = $1, "trial_ends_at" = $2 WHERE id = $3',
            ['TRIAL', trialEndDate, user.id]
        );

        return NextResponse.json({ message: 'Prueba de 3 días activada con éxito.' });

    } catch (error) {
        console.error('Error al activar la prueba:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
EOL

# --- FIX 3: src/app/api/recommendation/route.js (Dynamic Route) ---
echo "3. Corrigiendo src/app/api/recommendation/route.js..."
cat > src/app/api/recommendation/route.js << 'EOL'
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import db from '@/lib/db';
import { getChampionMastery } from '@/services/riotApiService';
import { getChampionNameById } from '@/services/dataDragonService';
import { generateStrategicAnalysis } from '@/lib/ai/strategist';
import { createInitialAnalysisPrompt } from '@/lib/ai/prompts';

const JWT_SECRET = process.env.JWT_SECRET;
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
    
    const userResult = await db.query('SELECT riot_id_name, region, puuid FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0 || !userResult.rows[0].puuid) {
      return NextResponse.json({ error: 'Perfil de invocador no vinculado.' }, { status: 404 });
    }
    const userData = userResult.rows[0];

    let championMasteryWithNames = [];

    // --- LÓGICA DE MAESTRÍA (Mantenida) ---
    if (userData.puuid.startsWith('simulated-')) {
      console.log('Modo Simulación: Usando datos de maestría de campeones falsos.');
      championMasteryWithNames = [
        { name: 'Yasuo', points: 150000 },
        { name: 'Lux', points: 120000 },
        { name: 'Zed', points: 95000 },
        { name: 'Jhin', points: 80000 },
        { name: 'Lee Sin', points: 75000 },
      ];
    } else {
      const championMasteryData = await getChampionMastery(userData.puuid, userData.region);
      championMasteryWithNames = await Promise.all(
        championMasteryData.map(async (mastery) => ({
          name: await getChampionNameById(mastery.championId),
          points: mastery.championPoints,
        }))
      );
    }
    // ------------------------------------
    
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
EOL

# --- FIX 4: src/app/api/challenges/weekly/route.js (Dynamic Route) ---
echo "4. Corrigiendo src/app/api/challenges/weekly/route.js..."
cat > src/app/api/challenges/weekly/route.js << 'EOL'
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import db from '@/lib/db'; 
import { getMatchHistoryIds, getMatchDetails } from '@/services/riotApiService';
import { generateStrategicAnalysis } from '@/lib/ai/strategist';
import { createChallengeGenerationPrompt } from '@/lib/ai/prompts';

const JWT_SECRET = process.env.JWT_SECRET;
export const dynamic = 'force-dynamic'; // Asegura la lectura del token

async function generateAndStoreChallenges(userId, userData) {
    let recentMatchesPerformance = [];

    // --- LÓGICA DE SIMULACIÓN (Mantenida) ---
    if (userData.puuid.startsWith('simulated-')) {
        console.log('Modo Simulación: Usando datos de historial de partidas falsos.');
        recentMatchesPerformance = [
            { win: true, kills: 10, deaths: 2, assists: 8, visionScore: 35, csPerMinute: 8.5 },
            { win: false, kills: 2, deaths: 8, assists: 5, visionScore: 15, csPerMinute: 6.0 },
            { win: true, kills: 15, deaths: 4, assists: 12, visionScore: 45, csPerMinute: 9.1 },
            { win: true, kills: 8, deaths: 1, assists: 10, visionScore: 55, csPerMinute: 7.8 },
            { win: false, kills: 4, deaths: 10, assists: 3, visionScore: 20, csPerMinute: 5.5 },
        ];
    } else {
        const matchIds = await getMatchHistoryIds(userData.puuid, userData.region);
        if (matchIds.length === 0) return [];
        
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
    }
    // ------------------------------------

    if (recentMatchesPerformance.length === 0) return [];

    const prompt = createChallengeGenerationPrompt({ summonerName: userData.riot_id_name, recentMatchesPerformance });
    const challengesFromAI = await generateStrategicAnalysis({ customPrompt: prompt });

    if (!Array.isArray(challengesFromAI)) {
        console.error("La IA no devolvió un array de desafíos. Se recibió:", challengesFromAI);
        return [];
    }
    
    // Transacción usando la pool exportada de db
    const client = await db.pool.connect(); 
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM user_challenges WHERE user_id = $1', [userId]);
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

        const { rows: activeChallenges } = await db.query(
            "SELECT * FROM user_challenges WHERE user_id = $1 AND expires_at > NOW() AND is_completed = FALSE",
            [userId]
        );

        if (activeChallenges.length > 0) {
            return NextResponse.json(activeChallenges);
        }

        const userResult = await db.query('SELECT riot_id_name, region, puuid FROM users WHERE id = $1', [userId]);
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
EOL

# --- FIX 5: src/app/api/challenges/progress/route.js (Dynamic Route) ---
echo "5. Corrigiendo src/app/api/challenges/progress/route.js..."
cat > src/app/api/challenges/progress/route.js << 'EOL'
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import db from '@/lib/db'; 
import { getMatchHistoryIds, getMatchDetails } from '@/services/riotApiService';

const JWT_SECRET = process.env.JWT_SECRET;
export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const token = request.headers.get('authorization')?.split(' ')[1];
        if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.userId;

        const userResult = await db.query('SELECT puuid, region FROM users WHERE id = $1', [userId]);
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

        const { rows: activeChallenges } = await db.query(
            "SELECT * FROM user_challenges WHERE user_id =