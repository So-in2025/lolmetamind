import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getToken } from 'next-auth/jwt';

export async function GET(req) {
    const token = await getToken({ req, secret: process.env.JWT_SECRET });
    if (!token) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

    try {
        const db = getPool();
        const result = await db.query('SELECT id, "googleId", email, "displayName", "avatarUrl", "createdAt", has_completed_onboarding FROM users WHERE id = $1', [token.id]);
        
        if (result.rows.length === 0) {
            return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });
        }
        
        return NextResponse.json(result.rows[0], { status: 200 });
    } catch (error) {
        console.error('Error al obtener datos del usuario:', error);
        return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
    }
}