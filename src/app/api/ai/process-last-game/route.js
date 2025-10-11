// src/app/api/ai/process-last-game/route.js
// ====================================================================================
// ENDPOINT DE ANÁLISIS POST-PARTIDA
// 🚨 CORRECCIÓN: Se elimina la importación de '@lib/auth' y se integra la lógica de JWT localmente.
// ====================================================================================

import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import aiOrchestrator from '@/lib/ai/aiOrchestrator';
import { createLcuPostGameAnalysisPrompt } from '@/lib/ai/prompts';
import jwt from 'jsonwebtoken'; // 🚨 Necesitamos importar JWT aquí

// 🚨 La misma clave secreta que usas en los otros endpoints
const JWT_SECRET = process.env.JWT_SECRET || 'p2s5v8y/B?E(H+MbQeThWmZq4t7w!z%C&F)J@NcRfUjXn2r5u8x/A?D*G-KaPdSg';

// --------------------------------------------------------
// 🔑 Helper de Autenticación (Ahora local en este archivo)
// --------------------------------------------------------
function authenticateUser(request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn('[API PROCESS-GAME] Auth failed: Missing Authorization header.');
        return null;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded;
    } catch (error) {
        console.error('[API PROCESS-GAME] Auth failed: Invalid token.', error.message);
        return null;
    }
}

// --------------------------------------------------------
// ⚙️ Handler POST Principal
// --------------------------------------------------------
export async function POST(request) {
    const decodedToken = authenticateUser(request);
    if (!decodedToken || !decodedToken.id) {
        return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
    }

    try {
        const sql = getSql();
        const userId = decodedToken.id;

        // 1. Obtener los datos de la partida y el análisis previo de la DB
        console.log(`[AI ANALYSIS] Iniciando análisis post-partida para usuario ID: ${userId}`);
        const [userProfile] = await sql.unsafe(`
            SELECT 
                live_game_data, 
                ai_strength_analysis, 
                ai_weakness_analysis
            FROM users 
            WHERE id = $1
        `, [userId]);

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
            await sql.unsafe(`
                UPDATE users
                SET 
                    ai_strength_analysis = $1,
                    ai_weakness_analysis = $2
                WHERE id = $3
            `, [newAnalysis.ai_strength_analysis, newAnalysis.ai_weakness_analysis, userId]);
            
            console.log(`[AI ANALYSIS] ✅ Perfil de rendimiento actualizado para el usuario ID: ${userId}`);
            return NextResponse.json({ message: 'Análisis completado y guardado.' }, { status: 200 });
        } else {
            throw new Error("La respuesta de la IA no tenía el formato esperado para el análisis.");
        }

    } catch (error) {
        console.error("[API PROCESS-LAST-GAME] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 200 });
}