import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db'; // CORRECCIÓN
import { getToken } from 'next-auth/jwt';

export async function POST(req) {
    const token = await getToken({ req, secret: process.env.JWT_SECRET });
    if (!token) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

    try {
        // const { matchesDb } = getDb(); // CORRECCIÓN
        const { matchData } = await req.json();
        
        // Lógica de IA para generar recomendaciones
        const recommendation = "Basado en tu última partida, enfócate en el control de oleadas.";

        return NextResponse.json({ recommendation }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Error generando recomendación' }, { status: 500 });
    }
}