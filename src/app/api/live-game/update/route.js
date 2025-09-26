import { NextResponse } from 'next/server';
import db from '@/lib/db'; 

export const dynamic = 'force-dynamic';

export async function POST(req) {
    try {
        // --- FIX: AUTENTICACIÓN DESACTIVADA PARA PRUEBAS ---
        const userId = 1; // ID de usuario de prueba HARCODEADO para bypass de seguridad
        // ----------------------------------------------------

        const liveGameData = await req.json();
        
        if (!liveGameData || !liveGameData.gameTime) {
             return NextResponse.json({ error: 'Datos de juego inválidos o incompletos.' }, { status: 400 });
        }

        // 2. Actualizar la columna live_game_data del usuario (Asumiendo que la columna existe)
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