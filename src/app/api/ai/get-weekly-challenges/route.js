// src/app/api/ai/get-weekly-challenges/route.js

import { NextResponse } from 'next/server';
import { runStrategicAnalysis } from '@/lib/ai/strategist'; // 🚨 FIX: Se usa el nombre de la función de multi-proveedor
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
        
        // CÓDIGO DETERMINISTA: Espera un 'array'
        const challenges = await runStrategicAnalysis(prompt, 'array'); // ✅ Se usa runStrategicAnalysis

        return NextResponse.json(challenges);

    } catch (error) {
        console.error('[API GET-CHALLENGES] Error:', error);
        return NextResponse.json({ error: 'Error interno al generar los desafíos.' }, { status: 500 });
    }
}