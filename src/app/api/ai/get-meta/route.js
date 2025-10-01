// src/app/api/ai/get-meta/route.js

import { NextResponse } from 'next/server';
import { generateStrategicAnalysis } from '@/lib/ai/strategist';
import { createMetaAnalysisPrompt } from '@/lib/ai/prompts';

export async function POST(request) {
    try {
        const body = await request.json(); 
        const { patchVersion } = body;

        const prompt = createMetaAnalysisPrompt(patchVersion || 'actual');
        
        // CORRECCIÓN: Pasar el prompt directamente como una cadena.
        const metaAnalysis = await generateStrategicAnalysis(prompt);

        return NextResponse.json(metaAnalysis);

    } catch (error) {
        console.error('[API GET-META] Error:', error);
        return NextResponse.json({ error: 'Error interno al generar el análisis del meta.' }, { status: 500 });
    }
}