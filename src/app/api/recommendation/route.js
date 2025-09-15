import { NextResponse } from 'next/server';
import { getStrategicAnalysis } from '../../../lib/ai/strategist';

export async function POST(request) {
  try {
    const playerData = await request.json();
    console.log('Datos recibidos en la API:', playerData);
    const analysis = await getStrategicAnalysis(playerData);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error en la API:', error);
    return NextResponse.json({ error: 'Hubo un error al procesar la solicitud' }, { status: 500 });
  }
}
