import { NextResponse } from 'next/server';

export async function POST(request) {
  const { matchId } = await request.json();
  console.log(`API de Análisis Post-Partida recibiendo solicitud para: ${matchId}`);
  
  // Datos simulados de un análisis post-partida
  const postMatchData = {
    performance: {
      kda: '12/3/8',
      score: 'A',
      csPerMinute: 8.2,
      damageDealt: 35420
    },
    strengths: [
      'Excelente posicionamiento en peleas de equipo.',
      'Control de objetivos (dragones) superior.'
    ],
    areasForImprovement: [
      'Necesitas mejorar tu visión. Compra más wards.',
      'Farmear de manera más eficiente en el early-game.'
    ]
  };
  
  return NextResponse.json(postMatchData);
}
