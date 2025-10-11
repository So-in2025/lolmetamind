// src/app/api/ai/process-last-game/route.js
import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import aiOrchestrator from '@/lib/ai/aiOrchestrator';
import { createLcuPostGameAnalysisPrompt } from '@/lib/ai/prompts';
import { authenticateUser } from '@/lib/auth'; // Asumiendo que tienes un helper de autenticación

export async function POST(request) {
    const decodedToken = authenticateUser(request);
    if (!decodedToken || !decodedToken.id) {
        return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }

    try {
        const sql = getSql();
        const userId = decodedToken.id;

        // 1. Obtener los datos de la partida y el análisis previo de la DB
        const [userProfile] = await sql`
            SELECT 
                live_game_data, 
                ai_strength_analysis, 
                ai_weakness_analysis
            FROM users 
            WHERE id = ${userId}
        `;

        if (!userProfile || !userProfile.live_game_data) {
            throw new Error("No se encontraron datos de la última partida para analizar.");
        }

        const finalGameData = userProfile.live_game_data;
        const existingAnalysis = {
            strength: userProfile.ai_strength_analysis,
            weakness: userProfile.ai_weakness_analysis
        };

        // 2. Generar el nuevo análisis con la IA
        const prompt = createLcuPostGameAnalysisPrompt(finalGameData, existingAnalysis);
        const newAnalysis = await aiOrchestrator.getOrchestratedResponse({
            prompt,
            kind: 'analysis', // Usar un modelo potente como gpt-4o-mini
        });

        // 3. Validar y actualizar la base de datos
        if (newAnalysis.ai_strength_analysis && newAnalysis.ai_weakness_analysis) {
            await sql`
                UPDATE users
                SET 
                    ai_strength_analysis = ${newAnalysis.ai_strength_analysis},
                    ai_weakness_analysis = ${newAnalysis.ai_weakness_analysis}
                WHERE id = ${userId}
            `;
            console.log(`[AI ANALYSIS] Perfil de rendimiento actualizado para el usuario ID: ${userId}`);
            return NextResponse.json({ message: 'Análisis post-partida completado.' }, { status: 200 });
        } else {
            throw new Error("La respuesta de la IA no tenía el formato esperado para el análisis.");
        }

    } catch (error) {
        console.error("[API PROCESS-LAST-GAME] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}