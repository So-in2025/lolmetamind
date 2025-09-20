import { NextResponse } from 'next/server';
import { headers } from 'next/headers'; // Se importa la función 'headers' de Next.js
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET;

// Se añade esta línea para forzar el renderizado dinámico, la causa del error.
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const headersList = headers();
    const authorization = headersList.get('authorization');

    const token = authorization?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No autorizado: Token no encontrado.' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const result = await pool.query(
      'SELECT id, username, email, riot_id_name, riot_id_tagline, region FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
    }
    console.error('Error al obtener datos del usuario:', error);
    return NextResponse.json({ error: 'Error del servidor al obtener datos del usuario.' }, { status: 500 });
  }
}
