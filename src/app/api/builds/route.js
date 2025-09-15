import { NextResponse } from 'next/server';

export async function POST(request) {
  const { matchData } = await request.json();
  console.log('API de Builds recibiendo datos para recomendaciones:', matchData);
  
  // Datos simulados de builds y runas personalizadas
  const customBuild = {
    items: [
      { name: "Luden's Companion", reason: "Excelente para el pokeo y el burst inicial." },
      { name: "Shadowflame", reason: "Para atravesar la resistencia mágica del enemigo." },
      { name: "Zhonya's Hourglass", reason: "Defensivo contra el asesino enemigo." }
    ],
    runes: [
      { name: "Arcane Comet", reason: "Daño extra por pokeo en la fase de líneas." },
      { name: "Manaflow Band", reason: "Mejora tu sustain de maná." }
    ]
  };
  
  return NextResponse.json(customBuild);
}
