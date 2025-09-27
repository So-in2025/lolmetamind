import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db'; // CORRECCIÓN
import { getToken } from 'next-auth/jwt';

export async function GET(req) {
    const token = await getToken({ req, secret: process.env.JWT_SECRET });
    if (!token) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

    try {
        const { usersDb } = getDb(); // CORRECCIÓN
        const user = await usersDb.get(token.id);
        const progress = user.challengesProgress || {};
        return NextResponse.json(progress, { status: 200 });
    } catch (error) {
        console.error("Error al obtener progreso de desafíos:", error);
        return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
    }
}