import { NextResponse } from 'next/server';
import { generateStrategicAnalysis } from '@/lib/ai/strategist';
import { createChallengeGenerationPrompt } from '@/lib/ai/prompts';
export async function POST(request) {
try {
const body = await request.json();
const { summonerName, recentMatchesPerformance } = body;

if (!summonerName) {
        return NextResponse.json({ error: 'Falta summonerName para generar desafíos.' }, { status: 400 });
    }

    const prompt = createChallengeGenerationPrompt({ 
        summonerName: summonerName, 
        recentMatchesPerformance: recentMatchesPerformance || {} 
    });
    const challenges = await generateStrategicAnalysis({ customPrompt: prompt });

    return NextResponse.json(challenges);

} catch (error) {
    console.error('[API GET-CHALLENGES] Error:', error);
    return NextResponse.json({ error: 'Error interno al generar los desafíos.' }, { status: 500 });
}
}