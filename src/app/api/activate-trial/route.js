import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db'; // CORRECCIÓN
import { getToken } from 'next-auth/jwt';

export async function POST(req) {
  const token = await getToken({ req, secret: process.env.JWT_SECRET });
  if (!token) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  try {
    const { usersDb } = getDb(); // CORRECCIÓN
    const userDoc = await usersDb.get(token.id);

    if (userDoc.trialActivated) {
      return NextResponse.json({ message: 'El período de prueba ya fue activado.' }, { status: 400 });
    }

    userDoc.trialActivated = true;
    userDoc.trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 días de prueba
    await usersDb.insert(userDoc);

    return NextResponse.json({ message: 'Período de prueba activado con éxito.' }, { status: 200 });
  } catch (error) {
    console.error('Error al activar el trial:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}