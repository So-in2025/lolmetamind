import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { getAccountByRiotId, getSummonerByPuuid } from '@/services/riotApiService';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    let { gameName, tagLine, region } = await request.json();
    if (!gameName || !tagLine || !region) {
      return NextResponse.json({ error: 'Nombre de juego, tagline y región son requeridos' }, { status: 400 });
    }

    tagLine = tagLine.startsWith('#') ? tagLine.substring(1) : tagLine;

    const accountData = await getAccountByRiotId(gameName, tagLine, region);
    const { puuid } = accountData;

    const summonerData = await getSummonerByPuuid(puuid, region);
    const { id: summoner_id } = summonerData;

    const result = await pool.query(
      `UPDATE users 
       SET riot_id_name = $1, riot_id_tagline = $2, region = $3, puuid = $4, summoner_id = $5, updated_at = NOW() 
       WHERE id = $6 
       RETURNING id, username, email, riot_id_name, riot_id_tagline, region`,
      [gameName, tagLine, region, puuid, summoner_id, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado en nuestra base de datos' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Perfil actualizado con éxito', user: result.rows[0] });

  } catch (error) {
    console.error('Error al actualizar perfil:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      return NextResponse.json({ error: `Riot ID no encontrado. Verifica el nombre, tagline y región.` }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error interno del servidor al procesar la solicitud.' }, { status: 500 });
  }
}
