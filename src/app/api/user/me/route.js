import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import db from '@/lib/db'; 

const JWT_SECRET = process.env.JWT_SECRET;
export const dynamic = 'force-dynamic'; 

export async function GET(req) {
    try {
        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        
        const decoded = jwt.verify(token, JWT_SECRET); 
        const userId = decoded.userId;

        // CRÍTICO: Consulta ajustada a las COLUMNAS REALES en tu DB (usando 'plan_status' en lugar de 'subscription_tier')
        const userResult = await db.query(
            'SELECT id, username, email, avatar_url, plan_status AS subscription_tier, riot_id_name, riot_id_tagline, region, puuid FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }
        
        // El alias 'plan_status AS subscription_tier' asegura que el frontend reciba el campo que espera.
        return NextResponse.json(userResult.rows[0]);

    } catch (error) {
        console.error('Error CRÍTICO al obtener los datos del usuario (FALLO FINAL):', error);
        // Si el 500 persiste, el único campo que queda es JWT_SECRET.
        return NextResponse.json({ error: 'Error interno del servidor. (Fallo de datos o de token)' }, { status: 500 });
    }
}