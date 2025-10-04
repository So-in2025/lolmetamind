// src/app/api/ai/live-coach/route.js (ENDPOINT DE COACHING EN TIEMPO REAL)

import { NextResponse, NextRequest } from 'next/server';
import { runStrategicAnalysis } from '@/lib/ai/strategist'; // 🚨 FIX: Se usa el nombre de la función de multi-proveedor
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
        // Llama al orquestador multi-proveedor
        const analysis = await runStrategicAnalysis(prompt, 'object'); // ✅ Uso de runStrategicAnalysis
        
        return NextResponse.json(analysis, { status: 200, headers: CORS_HEADERS });

    } catch (error) {
        console.error('[API LIVE-COACH] Error:', error);
        return NextResponse.json({ error: `Error interno al generar el coaching: ${error.message}` }, { status: 500, headers: CORS_HEADERS });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}