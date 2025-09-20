import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { getMatchHistoryIds, getMatchDetails } from '@/services/riotApiService';

const JWT_SECRET = process.env.JWT_SECRET;

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

        // Obtener la última partida del usuario
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

        // Obtener desafíos activos del usuario
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

            // Actualizar el progreso (este es un ejemplo simple, se puede hacer más complejo)
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
