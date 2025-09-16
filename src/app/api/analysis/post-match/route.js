// src/app/api/analysis/post-match/route.js
import { getSummonerByName } from '../../../../services/riotApiService';
import { generateStrategicAnalysis } from '../../../../lib/ai/strategist';

export async function POST(request) {
  const { summonerName } = await request.json();

  if (!summonerName) {
    return new Response(JSON.stringify({ error: 'summonerName es requerido' }), { status: 400 });
  }

  try {
    // TODO: Reemplazar con una lógica más robusta.
    // 1. Obtener datos del invocador.
    const summonerData = await getSummonerByName(summonerName);
    // 2. Obtener historial de partidas (a implementar en riotApiService.js).
    // const matchHistory = await getMatchHistory(summonerData.puuid);
    // 3. Enviar los datos de la última partida a la IA.
    const analysis = await generateStrategicAnalysis({ summonerData /*, matchHistory */ });

    return new Response(JSON.stringify({ analysis }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error al procesar el análisis' }), { status: 500 });
  }
}
