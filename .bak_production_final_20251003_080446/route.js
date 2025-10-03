// src/app/api/ai/live-coach/route.js (ENDPOINT DE COACHING EN TIEMPO REAL)

import { NextResponse, NextRequest } from 'next/server'; // Se añade NextRequest por si acaso
import { generateStrategicAnalysis } from '@/lib/ai/strategist';
import { createLiveCoachingPrompt } from '@/lib/ai/prompts';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(request) {
    try {
        const { liveData, userData } = await request.json();

        if (!liveData?.activePlayer || !userData?.zodiacSign) {
            return NextResponse.json({ message: 'Datos de juego o de usuario incompletos para el coaching.' }, { status: 400, headers: CORS_HEADERS });
        }

        const prompt = createLiveCoachingPrompt(liveData, userData.zodiacSign);
        
        // CÓDIGO DETERMINISTA: Espera un 'object'
        const analysis = await generateStrategicAnalysis(prompt, 'object');
        
        return NextResponse.json(analysis, { status: 200, headers: CORS_HEADERS });

    } catch (error) {
        console.error('[API LIVE-COACH] Error:', error);
        return NextResponse.json({ error: `Error interno al generar el coaching: ${error.message}` }, { status: 500, headers: CORS_HEADERS });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}
