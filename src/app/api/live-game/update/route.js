import { NextResponse } from 'next/server';
import db from '@/lib/db'; 
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
export const dynamic = 'force-dynamic';

export async function POST(req) {
    try {
        // --- BYPASS DE SEGURIDAD PARA USO PERSONAL/PRUEBA ---
        // Se usa el ID 1 como usuario de prueba fijo.
        const userId = 1; 
        // ----------------------------------------------------

        const liveGameData = await req.json();
        
        if (!liveGameData || !liveGameData.gameTime) {
             return NextResponse.json({ error: 'Datos de juego inválidos o incompletos.' }, { status: 400 });
        }

        // Se guarda la data en el usuario 1
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