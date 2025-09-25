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
