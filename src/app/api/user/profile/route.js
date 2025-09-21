import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { getAccountByRiotId, getSummonerByName } from '@/services/riotApiService';

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
      return NextResponse.json({ error: 'Nombre de juego, tagline y región son requeridos' }, { status: 400 });
    }

    // *** NUEVA LÓGICA DE VINCULACIÓN ROBUSTA ***
    
    // 1. Obtener la cuenta para asegurar que el Riot ID es válido y obtener el PUUID oficial.
    const accountData = await getAccountByRiotId(gameName, tagLine, region);
    const officialPuuid = accountData.puuid;

    // 2. Obtener los datos del invocador directamente por nombre (método más fiable).
    const summonerData = await getSummonerByName(gameName, region);
    const { id: summoner_id, puuid: summonerPuuid } = summonerData;

    // 3. Verificación cruzada: Asegurarnos de que el PUUID coincide en ambos endpoints.
    if (officialPuuid !== summonerPuuid) {
        throw new Error("Inconsistencia de datos en la API de Riot. El PUUID del Riot ID no coincide con el del Invocador.");
    }

    const result = await pool.query(
      `UPDATE users 
       SET riot_id_name = $1, riot_id_tagline = $2, region = $3, puuid = $4, summoner_id = $5, updated_at = NOW() 
       WHERE id = $6 
       RETURNING id, username, email, riot_id_name, riot_id_tagline, region, puuid`,
      [gameName, tagLine, region, officialPuuid, summoner_id, userId]
    );

    return NextResponse.json({ message: 'Perfil actualizado con éxito', user: result.rows[0] });

  } catch (error) {
    console.error('Error al actualizar perfil:', error.message);
    return NextResponse.json({ error: `No se pudo vincular el perfil. Razón: ${error.message}` }, { status: 500 });
  }
}
