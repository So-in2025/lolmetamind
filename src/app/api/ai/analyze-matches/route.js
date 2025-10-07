// src/app/api/ai/analyze-matches/route.js

import { NextResponse } from 'next/server';
import { generateStrategicAnalysis } from '@/lib/ai/strategist';
import { createPerformanceAnalysisPrompt } from '@/lib/ai/prompts';

export async function POST(request) {
    try {
        const body = await request.json();
        const { matchHistory, summonerData } = body;

        if (!summonerData) {
            return NextResponse.json({ error: 'Faltan datos del invocador.' }, { status: 400 });
        }
        
        const prompt = createPerformanceAnalysisPrompt(matchHistory || [], summonerData);
        
        // CÓDIGO DETERMINISTA: Espera un 'object'
        const analysis = await generateStrategicAnalysis(prompt, 'object');

        return NextResponse.json(analysis);

    } catch (error) {
        console.error('[API ANALYZE-MATCHES] Error:', error);
        return NextResponse.json({ error: 'Error interno al analizar las partidas.' }, { status: 500 });
    }
}
