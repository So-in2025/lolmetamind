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
