// Ruta: so-in2025/lolmetamind/lolmetamind-adffad4206b2a133fe3e3e14ba85b1b8b418f9c3/src/app/api/live-game/update/route.js

import { NextResponse } from 'next/server';
import db from '@/lib/db'; 

export const dynamic = 'force-dynamic';

export async function POST(req) {
    
    // --- BYPASS DE AUTENTICACIÓN: USAR ID 1 ---
    const userId = 1; 

    try {
        const liveGameData = await req.json();
        
        // Si no está en partida activa, devolvemos 204.
        if (!liveGameData || liveGameData.gameflow.phase === 'None') {
             return new NextResponse(null, { status: 204 }); 
        }

        // Guardar la data LCU en la base de datos para el usuario 1
        await db.query(
            'UPDATE users SET live_game_data = $1, updated_at = NOW() WHERE id = $2',
            [liveGameData, userId]
        );

        return NextResponse.json({ message: 'Datos LCU recibidos y guardados en DB.', userId: userId });

    } catch (error) {
        console.error('Error CRÍTICO al actualizar datos LCU:', error); 
        return NextResponse.json({ error: 'Error interno del servidor al procesar datos LCU.' }, { status: 500 });
    }
}