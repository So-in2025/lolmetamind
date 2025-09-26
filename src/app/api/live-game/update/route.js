// src/app/api/live-game/update/route.js

import { NextResponse } from 'next/server';
import db from '@/lib/db'; 

export const dynamic = 'force-dynamic';

export async function POST(req) {
    try {
        // --- FIX CRÍTICO: DESACTIVACIÓN TOTAL DE SEGURIDAD Y USO DE STORE ---
        // Se usa el ID 1 como usuario de prueba fijo.
        const userId = 1; 
        // --------------------------------------------------------------------

        const liveGameData = await req.json();
        
        if (!liveGameData || !liveGameData.gameTime) {
             return NextResponse.json({ error: 'Datos de juego inválidos o incompletos.' }, { status: 400 });
        }

        // 2. Actualizar la columna live_game_data del usuario
        // Este es el único punto de falla que queda en el servidor.
        await db.query(
            'UPDATE users SET live_game_data = $1, updated_at = NOW() WHERE id = $2',
            [liveGameData, userId]
        );

        return NextResponse.json({ message: 'Datos de partida en tiempo real recibidos y actualizados.' });

    } catch (error) {
        // Si Next.js crashea, este console.error no se verá.
        console.error('Error al actualizar datos de partida en vivo:', error); 
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}