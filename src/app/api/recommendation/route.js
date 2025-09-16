import { NextResponse } from 'next/server';
import { generateStrategicAnalysis } from '../../../lib/ai/strategist';

export async function POST(request) {
  try {
    const playerData = await request.json();
    console.log('API de recomendación recibiendo datos:', playerData);
    
    // La función ahora devuelve directamente el objeto JSON del análisis
    const analysisResult = await generateStrategicAnalysis(playerData);

    // Si la IA devolvió un error, lo propagamos al cliente con un estado 503
    if (analysisResult.error) {
      return NextResponse.json({ error: analysisResult.message }, { status: 503 });
    }

    // Si todo fue bien, devolvemos el análisis completo
    return NextResponse.json(analysisResult);

  } catch (error) {
    console.error('Error en el endpoint /api/recommendation:', error);
    return NextResponse.json({ error: 'Hubo un error interno al procesar la solicitud' }, { status: 500 });
  }
}
