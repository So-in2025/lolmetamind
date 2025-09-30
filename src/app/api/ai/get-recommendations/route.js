// lolmetamind/src/app/api/ai/get-recommendations/route.js

import { NextResponse } from 'next/server';
import { generateStrategicAnalysis } from '@/lib/ai/strategist';
import { createInitialAnalysisPrompt } from '@/lib/ai/prompts'; 

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(request) {
    try {
        const { summoner, draft } = await request.json();

        // 🚨 VALIDACIÓN CRÍTICA: Asegurarse de que summoner y zodiacSign estén presentes
        if (!summoner || !summoner.summonerName || !summoner.zodiacSign) {
            console.error("[API GET-RECOMMENDATIONS] Error: Faltan datos esenciales del invocador para la IA (summonerName, zodiacSign).");
            return NextResponse.json(
                { message: "Faltan datos esenciales del invocador para generar recomendaciones. Asegúrate de que el perfil esté completo (incluyendo signo zodiacal)." },
                { status: 400, headers: CORS_HEADERS }
            );
        }
        
        console.log(`[Strategist] Enviando prompt a Gemini 1.0 Pro para recomendaciones iniciales...`);

        // Crea el prompt con los datos disponibles, sin forzar 'rank' si no existe
        const prompt = createInitialAnalysisPrompt({
            summonerName: summoner.summonerName,
            zodiacSign: summoner.zodiacSign,
            // Aquí puedes pasar otros datos si los tienes, como roles, campeones, etc.
            // Por ejemplo: roles: summoner.roles, favoriteChampions: summoner.favoriteChampions
            draft: draft
        });

        const analysis = await generateStrategicAnalysis(prompt);

        return NextResponse.json(analysis, { status: 200, headers: CORS_HEADERS });

    } catch (error) {
        console.error("[API GET-RECOMMENDATIONS] Error en la generación de recomendaciones:", error);
        return NextResponse.json(
            { message: `Error: No se pudo completar el análisis de la IA. Detalles: ${error.message}` },
            { status: 500, headers: CORS_HEADERS }
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}