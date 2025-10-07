// src/app/api/ai/get-meta/route.js

import { NextResponse } from 'next/server';
import { runStrategicAnalysis } from '@/lib/ai/strategist'; // 🚨 FIX: Se usa el nombre de la función de multi-proveedor
import { createMetaAnalysisPrompt } from '@/lib/ai/prompts';

export async function POST(request) {
    try {
        const body = await request.json(); 
        const { patchVersion } = body;

        const prompt = createMetaAnalysisPrompt(patchVersion || 'actual');
        
        // CÓDIGO DETERMINISTA: Espera un 'object'
        const metaAnalysis = await runStrategicAnalysis(prompt, 'object'); // ✅ Se usa runStrategicAnalysis

        return NextResponse.json(metaAnalysis);

    } catch (error) {
        console.error('[API GET-META] Error:', error);
        return NextResponse.json({ error: 'Error interno al generar el análisis del meta.' }, { status: 500 });
    }
}