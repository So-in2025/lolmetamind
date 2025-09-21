import { NextResponse } from 'next/server';

export async function GET() {
  // Datos simulados de rankings zodiacales
  const rankings = [
    { rank: 1, sign: "Leo", points: 15230, winrate: 61.2 },
    { rank: 2, sign: "Scorpio", points: 14890, winrate: 59.8 },
    { rank: 3, sign: "Aries", points: 13500, winrate: 55.3 },
    { rank: 4, sign: "Sagitario", points: 12100, winrate: 53.1 },
    { rank: 5, sign: "Virgo", points: 11800, winrate: 52.7 }
  ];
  return NextResponse.json(rankings);
}
