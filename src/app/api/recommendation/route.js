import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { getChampionMastery } from '@/services/riotApiService';
import { generateStrategicAnalysis } from '@/lib/ai/strategist';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(request) {
  try {
    // 1. Autenticar al usuario y obtener su ID de nuestra base de datos
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    // 2. Obtener el signo zodiacal del cuerpo de la solicitud
    const { zodiacSign } = await request.json();
    if (!zodiacSign) {
      return NextResponse.json({ error: 'Signo zodiacal es requerido.' }, { status: 400 });
    }
    
    // 3. Obtener los datos de Riot del usuario desde nuestra base de datos
    const userResult = await pool.query(
      'SELECT riot_id_name, region, puuid FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length === 0 || !userResult.rows[0].puuid) {
      return NextResponse.json({ error: 'Perfil de invocador no encontrado o incompleto.' }, { status: 404 });
    }
    const userData = userResult.rows[0];

    // 4. *** LLAMADA A LA API DE RIOT ***
    // Usar los datos de nuestra DB para pedir los datos de maestría a Riot
    const championMastery = await getChampionMastery(userData.puuid, userData.region);

    // 5. Preparar todos los datos para la IA
    const analysisData = {
      summonerName: userData.riot_id_name,
      zodiacSign: zodiacSign,
      championMastery: championMastery // Datos reales de Riot
    };

    // 6. Llamar a la IA con los datos reales
    const analysisResult = await generateStrategicAnalysis(analysisData);

    if (analysisResult.error) {
      return NextResponse.json({ error: analysisResult.message }, { status: 503 });
    }

    return NextResponse.json(analysisResult);

  } catch (error) {
    console.error('Error en el endpoint /api/recommendation:', error);
    return NextResponse.json({ error: 'Error interno al procesar la solicitud de IA' }, { status: 500 });
  }
}
