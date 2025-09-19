import { NextResponse } from 'next/server';
import { searchAccountsByGameName } from '@/services/riotApiService';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  if (!name || name.length < 3) {
    return NextResponse.json([]);
  }

  try {
    const results = await searchAccountsByGameName(name);
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching Riot ID suggestions:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
