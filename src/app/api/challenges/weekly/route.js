import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import db from '@/lib/db'; 
import { getMatchHistoryIds, getMatchDetails } from '@/services/riotApiService';
import { generateStrategicAnalysis } from '@/lib/ai/strategist';
import { createChallengeGenerationPrompt } from '@/lib/ai/prompts';

const JWT_SECRET = process.env.JWT_SECRET;
export const dynamic = 'force-dynamic';

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
