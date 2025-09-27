import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db'; // CORRECCIÓN
import { getToken } from 'next-auth/jwt';

export async function POST(req) {
    const token = await getToken({ req, secret: process.env.JWT_SECRET });
    if (!token) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

    try {
        const { usersDb } = getDb(); // CORRECCIÓN
        const user = await usersDb.get(token.id);

        // Lógica de verificación de licencia
        const isValid = user.subscriptionStatus === 'active' || user.trialEndsAt > new Date().toISOString();

        return NextResponse.json({ isValid }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ isValid: false, message: 'Error interno' }, { status: 500 });
    }
}