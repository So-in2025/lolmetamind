import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db'; // CORRECCIÓN
import { getToken } from 'next-auth/jwt'; // CORRECCIÓN

export async function POST(req) {
  const token = await getToken({ req, secret: process.env.JWT_SECRET });

  if (!token) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const { matchesDb } = getDb();
    const liveGameData = await req.json();

    console.log('Datos de partida en vivo recibidos para el usuario:', token.id);
    
    // await matchesDb.insert({ ... });

    return NextResponse.json({ message: 'Datos de partida recibidos' }, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar datos de la partida:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
