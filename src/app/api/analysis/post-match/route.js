import { NextResponse } from 'next/server';
import { getAccountByRiotId, getSummonerByPuuid } from '../../../../services/riotApiService';
import { generateStrategicAnalysis } from '../../../../lib/ai/strategist';

export async function POST(request) {
  const { gameName, tagLine, region } = await request.json();

  if (!gameName || !tagLine || !region) {
    return NextResponse.json({ error: 'Nombre de juego, tagline y región son requeridos' }, { status: 400 });
  }

  try {
    const accountData = await getAccountByRiotId(gameName, tagLine, region);
    const { puuid } = accountData;
    const summonerData = await getSummonerByPuuid(puuid, region);
    const { id: summonerId } = summonerData;
    
    // Lógica para obtener el historial de partidas y generar el análisis con la IA
    // Esta es una simulación ya que la API de historial de partidas no está implementada
    const mockMatchHistory = {};
    const analysis = await generateStrategicAnalysis({ summonerData, matchHistory: mockMatchHistory });

    if (analysis.error) {
      return NextResponse.json({ error: analysis.message }, { status: 503 });
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error al procesar el análisis post-partida:', error.response?.data || error.message);
    return NextResponse.json({ error: 'Error interno del servidor al procesar la solicitud.' }, { status: 500 });
  }
}
