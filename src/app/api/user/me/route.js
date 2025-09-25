import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import db from '@/lib/db'; // Importación correcta (exportación por defecto)

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(req) {
    try {
        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.userId;

        const userResult = await db.query(
            // La autenticación ahora usa el ID de la tabla users obtenido del JWT.
            'SELECT id, username, email, avatar_url, license_key, subscription_tier, trial_ends_at, riot_id_name, riot_id_tagline, region, puuid FROM users WHERE id = $1',
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
