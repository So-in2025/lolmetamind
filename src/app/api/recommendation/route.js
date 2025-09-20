import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { getChampionMastery } from '@/services/riotApiService';
import { generateStrategicAnalysis } from '@/lib/ai/strategist';

const JWT_SECRET = process.env.JWT_SECRET;

// Lista de posibles pronósticos astrológicos para dar variedad diaria
const dailyForecasts = [
  "Hoy, Marte favorece la agresión calculada y las iniciaciones audaces.",
  "La influencia de la Luna pide un enfoque en el control de la visión y la protección del equipo.",
  "Mercurio está retrógrado; la comunicación y el engaño son tus mejores armas.",
  "Venus en tu casa promueve la cooperación; busca sinergias fuertes con tus aliados.",
  "La energía de Júpiter expande tus oportunidades; busca rotaciones y objetivos globales.",
  "Saturno demanda paciencia; céntrate en el farmeo y el escalado para el juego tardío.",
  "El Sol ilumina tus fortalezas; juega tus campeones de confort con confianza."
];

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const { zodiacSign } = await request.json();
    if (!zodiacSign) return NextResponse.json({ error: 'Signo zodiacal es requerido.' }, { status: 400 });
    
    const userResult = await pool.query(
      'SELECT riot_id_name, region, puuid FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length === 0 || !userResult.rows[0].puuid) {
      return NextResponse.json({ error: 'Perfil de invocador no encontrado o incompleto.' }, { status: 404 });
    }
    const userData = userResult.rows[0];

    const championMastery = await getChampionMastery(userData.puuid, userData.region);

    // *** LÓGICA DE ATRACCIÓN DIARIA ***
    // Selecciona un pronóstico basado en el día del año para que cambie diariamente.
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const dailyAstrologicalForecast = dailyForecasts[dayOfYear % dailyForecasts.length];

    const analysisData = {
      summonerName: userData.riot_id_name,
      zodiacSign: zodiacSign,
      championMastery: championMastery,
      dailyAstrologicalForecast: dailyAstrologicalForecast // Añadimos el nuevo dato
    };

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
