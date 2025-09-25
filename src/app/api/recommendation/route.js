import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import db from '@/lib/db';
import { getChampionMastery } from '@/services/riotApiService';
import { getChampionNameById } from '@/services/dataDragonService';
import { generateStrategicAnalysis } from '@/lib/ai/strategist';
import { createInitialAnalysisPrompt } from '@/lib/ai/prompts';

const JWT_SECRET = process.env.JWT_SECRET;
export const dynamic = 'force-dynamic'; 

const dailyForecasts = [
  "Hoy, Marte favorece la agresión calculada.",
  "La influencia de la Luna pide un enfoque en el control de la visión.",
  "Mercurio está retrógrado; la comunicación y el engaño son tus mejores armas."
];

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const { zodiacSign } = await request.json();
    if (!zodiacSign) return NextResponse.json({ error: 'Signo zodiacal es requerido.' }, { status: 400 });
    
    const userResult = await db.query('SELECT riot_id_name, region, puuid FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0 || !userResult.rows[0].puuid) {
      return NextResponse.json({ error: 'Perfil de invocador no vinculado.' }, { status: 404 });
    }
    const userData = userResult.rows[0];

    let championMasteryWithNames = [];

    // --- LÓGICA DE MAESTRÍA (Mantenida) ---
    if (userData.puuid.startsWith('simulated-')) {
      console.log('Modo Simulación: Usando datos de maestría de campeones falsos.');
      championMasteryWithNames = [
        { name: 'Yasuo', points: 150000 },
        { name: 'Lux', points: 120000 },
        { name: 'Zed', points: 95000 },
        { name: 'Jhin', points: 80000 },
        { name: 'Lee Sin', points: 75000 },
      ];
    } else {
      const championMasteryData = await getChampionMastery(userData.puuid, userData.region);
      championMasteryWithNames = await Promise.all(
        championMasteryData.map(async (mastery) => ({
          name: await getChampionNameById(mastery.championId),
          points: mastery.championPoints,
        }))
      );
    }
    // ------------------------------------
    
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const dailyAstrologicalForecast = dailyForecasts[dayOfYear % dailyForecasts.length];

    const analysisData = {
      summonerName: userData.riot_id_name,
      zodiacSign: zodiacSign,
      championMastery: championMasteryWithNames,
      dailyAstrologicalForecast: dailyAstrologicalForecast
    };

    const prompt = createInitialAnalysisPrompt(analysisData);
    const analysisResult = await generateStrategicAnalysis({ customPrompt: prompt });

    return NextResponse.json(analysisResult);

  } catch (error) {
    console.error("Error CRÍTICO E INESPERADO en /api/recommendation:", error);
    return NextResponse.json({ error: 'Un error fatal ocurrió en el servidor.' }, { status: 500 });
  }
}
