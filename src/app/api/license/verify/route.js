import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getToken } from 'next-auth/jwt';

export async function POST(req) {
    const token = await getToken({ req, secret: process.env.JWT_SECRET });
    if (!token) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

    try {
        const db = getPool();
        const result = await db.query('SELECT "subscriptionStatus", "trialEndsAt" FROM users WHERE id = $1', [token.id]);
        if (result.rows.length === 0) {
            return NextResponse.json({ isValid: false }, { status: 404 });
        }
        const user = result.rows[0];
        const isValid = user.subscriptionStatus === 'active' || (user.trialEndsAt && new Date(user.trialEndsAt) > new Date());
        return NextResponse.json({ isValid }, { status: 200 });
    } catch (error) {
        console.error('Error al verificar licencia:', error);
        return NextResponse.json({ isValid: false, message: 'Error interno' }, { status: 500 });
    }
}