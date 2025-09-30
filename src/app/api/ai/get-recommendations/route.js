// src/app/api/ai/get-recommendations/route.js
import { NextResponse } from 'next/server';
import { generateStrategicAnalysis } from '@/lib/ai/strategist';
import { createChampSelectPrompt } from '@/lib/ai/prompts'; // <-- ¡NUEVO PROMPT!

export async function POST(request) {
    try {
        const body = await request.json();
        const { draft, summoner } = body;

        if (!draft) {
            return NextResponse.json({ error: 'Faltan datos del draft para el análisis.' }, { status: 400 });
        }

        // 1. Crear el prompt específico para Champ Select
        const prompt = createChampSelectPrompt(draft, summoner);

        // 2. Llamar al estratega de IA con el prompt
        const recommendations = await generateStrategicAnalysis({ customPrompt: prompt });

        return NextResponse.json(recommendations);

    } catch (error) {
        console.error('[API GET-RECOMMENDATIONS] Error:', error);
        return NextResponse.json({ error: 'Error interno al generar recomendaciones con la IA.' }, { status: 500 });
    }
}