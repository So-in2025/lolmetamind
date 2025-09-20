import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { getMatchHistoryIds, getMatchDetails, getChampionMastery } from '@/services/riotApiService';
import { generateStrategicAnalysis } from '@/lib/ai/strategist';
import { createChallengeGenerationPrompt } from '@/lib/ai/prompts';

const JWT_SECRET = process.env.JWT_SECRET;

async function generateAndStoreChallenges(userId, userData) {
    // 1. Obtener historial de partidas
    const matchIds = await getMatchHistoryIds(userData.puuid, userData.region);
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

    // 2. Generar desafíos con la IA
    const prompt = createChallengeGenerationPrompt({ summonerName: userData.riot_id_name, recentMatchesPerformance });
    const challengesFromAI = await generateStrategicAnalysis({ customPrompt: prompt });

    // 3. Guardar desafíos en la base de datos
    const client = await pool.connect();
    try {
        for (const challenge of challengesFromAI) {
            const expires_at = new Date();
            if (challenge.challenge_type === 'daily') {
                expires_at.setDate(expires_at.getDate() + 1);
            } else {
                expires_at.setDate(expires_at.getDate() + 7);
            }

            await client.query(
                `INSERT INTO user_challenges (user_id, title, description, challenge_type, metric, goal, expires_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [userId, challenge.title, challenge.description, challenge.challenge_type, challenge.metric, challenge.goal, expires_at]
            );
        }
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

        // Buscar desafíos activos
        const { rows: activeChallenges } = await pool.query(
            "SELECT * FROM user_challenges WHERE user_id = $1 AND expires_at > NOW() AND is_completed = FALSE",
            [userId]
        );

        if (activeChallenges.length > 0) {
            return NextResponse.json(activeChallenges);
        }

        // Si no hay desafíos, generar nuevos
        const userResult = await pool.query('SELECT riot_id_name, region, puuid FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0 || !userResult.rows[0].puuid) {
            return NextResponse.json([]); // Devuelve vacío si el usuario no ha vinculado su cuenta
        }
        const newChallenges = await generateAndStoreChallenges(userId, userResult.rows[0]);
        return NextResponse.json(newChallenges);

    } catch (error) {
        console.error("Error en la API de desafíos:", error);
        return NextResponse.json({ error: 'Error interno del servidor al gestionar desafíos.' }, { status: 500 });
    }
}
