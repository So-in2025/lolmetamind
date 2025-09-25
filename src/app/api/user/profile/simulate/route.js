import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import db from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET;
export const dynamic = 'force-dynamic'; 

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const { gameName, tagLine, region } = await request.json();
    if (!gameName || !tagLine || !region) {
      return NextResponse.json({ error: 'Faltan datos para la simulación' }, { status: 400 });
    }

    const mockPuuid = `simulated-puuid-${userId}-${gameName}`;
    const mockSummonerId = `simulated-summoner-id-${userId}-${gameName}`;

    const result = await db.query(
      `UPDATE users 
       SET riot_id_name = $1, riot_id_tagline = $2, region = $3, puuid = $4, summoner_id = $5, updated_at = NOW() 
       WHERE id = $6 
       RETURNING id, username, email, riot_id_name, riot_id_tagline, region, puuid`,
      [gameName, tagLine, region, mockPuuid, mockSummonerId, userId]
    );

    return NextResponse.json({ message: 'Perfil simulado con éxito', user: result.rows[0] });

  } catch (error) {
    console.error('Error al simular perfil:', error.message);
    return NextResponse.json({ error: 'No se pudo crear el perfil simulado.' }, { status: 500 });
  }
}
