import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getToken } from 'next-auth/jwt';

export async function POST(req) {
  const token = await getToken({ req, secret: process.env.JWT_SECRET });
  if (!token) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  try {
    const db = getPool();
    const liveGameData = await req.json();
    const matchId = liveGameData.gameId;
    
    // Aquí iría la lógica para insertar o actualizar en la tabla 'matches'
    // await db.query('INSERT INTO matches (...) VALUES (...)');

    console.log('Datos de partida en vivo recibidos para el usuario:', token.id);
    return NextResponse.json({ message: 'Datos de partida recibidos' }, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar datos de la partida:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}