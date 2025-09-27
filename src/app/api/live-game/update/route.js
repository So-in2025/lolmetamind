// src/app/api/live-game/update/route.js

import { NextResponse } from 'next/server';
// --- CORRECCIÓN: Se importa la instancia central de la base de datos ---
import { matchesDb } from '@/lib/db';
import { getToken } from 'next-auth/jwt';

export async function POST(req) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
        return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    try {
        const liveGameData = await req.json();

        // Aquí procesarías los datos de la partida en vivo
        // y los guardarías en la base de datos 'matches'
        
        // Ejemplo:
        // const matchId = liveGameData.gameId;
        // await matchesDb.insert({ _id: matchId.toString(), ...liveGameData, userId: token.sub });

        console.log('Datos de partida en vivo recibidos para el usuario:', token.sub);

        return NextResponse.json({ message: 'Datos de partida recibidos' }, { status: 200 });

    } catch (error) {
        console.error('Error al actualizar datos de la partida en vivo:', error);
        return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
    }
}