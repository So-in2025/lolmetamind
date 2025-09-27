import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getToken } from 'next-auth/jwt';

export async function POST(req) {
  const token = await getToken({ req, secret: process.env.JWT_SECRET });
  if (!token) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  try {
    const db = getPool();
    const { userId, lolUsername, mainRole, secondaryRole, playStyle } = await req.json();

    if (token.id !== userId) {
      return NextResponse.json({ message: 'Conflicto de ID de usuario' }, { status: 403 });
    }

    const query = 'UPDATE users SET "lolUsername" = $1, "mainRole" = $2, "secondaryRole" = $3, "playStyle" = $4, has_completed_onboarding = true WHERE id = $5';
    await db.query(query, [lolUsername, mainRole, secondaryRole, playStyle, userId]);

    return NextResponse.json({ message: 'Perfil actualizado con éxito' }, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar el perfil:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}