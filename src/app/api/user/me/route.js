import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db'; // CORRECCIÓN
import { getToken } from 'next-auth/jwt';

export async function GET(req) {
    const token = await getToken({ req, secret: process.env.JWT_SECRET });
    if (!token) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

    try {
        const { usersDb } = getDb(); // CORRECCIÓN
        const user = await usersDb.get(token.id);
        // Quitamos datos sensibles antes de enviar
        const { _rev, ...userData } = user;
        return NextResponse.json(userData, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });
    }
}