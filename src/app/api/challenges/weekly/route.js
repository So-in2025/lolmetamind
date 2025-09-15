import { NextResponse } from 'next/server';

export async function GET() {
  // Datos simulados de retos semanales
  const challenges = [
    {
      id: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      title: "Dominancia de Asesino",
      description: "Consigue 10 asesinatos en 3 partidas con un campeón de arquetipo 'Asesino'.",
      progress: 7,
      goal: 10,
      reward: "Badge exclusivo 'Sombra Zodiacal'",
      isCompleted: false
    },
    {
      id: "b2c3d4e5-f6a7-8901-2345-67890abcdef1",
      title: "El Muro Inamovible",
      description: "Absorbe más de 50,000 de daño en una sola partida como 'Tanque'.",
      progress: 50000,
      goal: 50000,
      reward: "Icono de Invocador 'Guardián Cósmico'",
      isCompleted: false
    }
  ];
  return NextResponse.json(challenges);
}
