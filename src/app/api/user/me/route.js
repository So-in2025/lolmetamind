import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { db } from '@/lib/db';

export async function GET(req) {
    try {
        const { userId } = auth();
        if (!userId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userResult = await db.query(
            'SELECT id, name, email, avatar_url, license_key, subscription_tier, trial_ends_at FROM users WHERE google_id = ',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        return NextResponse.json(userResult.rows[0]);

    } catch (error) {
        console.error('Error al obtener los datos del usuario:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
