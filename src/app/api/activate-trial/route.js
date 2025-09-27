import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getToken } from 'next-auth/jwt';

export async function POST(req) {
  const token = await getToken({ req, secret: process.env.JWT_SECRET });
  if (!token) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  try {
    const db = getPool();
    const userResult = await db.query('SELECT "trialActivated" FROM users WHERE id = $1', [token.id]);

    if (userResult.rows.length === 0) {
      return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });
    }
    if (userResult.rows[0].trialActivated) {
      return NextResponse.json({ message: 'El período de prueba ya fue activado.' }, { status: 400 });
    }

    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await db.query('UPDATE users SET "trialActivated" = true, "trialEndsAt" = $1 WHERE id = $2', [trialEndsAt, token.id]);

    return NextResponse.json({ message: 'Período de prueba activado con éxito.' }, { status: 200 });
  } catch (error) {
    console.error('Error al activar el trial:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}