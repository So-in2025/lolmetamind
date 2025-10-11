// src/app/api/user/profile/route.js - BLOQUE COMPLETO Y CORREGIDO FINAL (v4)

import { NextResponse, NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { getSql } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'p2s5v8y/B?E(H+MbQeThWmZq4t7w!z%C&F)J@NcRfUjXn2r5u8x/A?D*G-KaPdSg';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function authenticateUser(request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded;
    } catch (error) {
        return null;
    }
}

export async function GET(request) {
    console.log('[API USER/PROFILE] Solicitud de perfil recibida.');
    const sql = getSql();
    const decodedToken = authenticateUser(request);
    
    if (!decodedToken || !decodedToken.id) {
        console.warn('[API USER/PROFILE] ❌ Acceso denegado: Token ausente o inválido.');
        return NextResponse.json({ message: 'No autorizado o token inválido.' }, { status: 401, headers: CORS_HEADERS });
    }

    try {
        const userId = decodedToken.id;
        
        // 🚨 CRÍTICO: SOLO SELECCIONAMOS LAS COLUMNAS CONFIRMADAS QUE EXISTEN EN LA DB
        const ENV_HF_TOKEN = process.env.HUGGING_FACE_TOKEN || process.env.HF_API_TOKEN; 

        const queryText = `
            SELECT 
                id,
                username,
                email,
                google_id,
                "summonerName",
                tagline, 
                region,
                puuid,
                summoner_id,
                paddle_customer_id,
                "zodiacSign",
                "favRole1",
                "favRole2",
                "favChamp1",
                "favChamp2",
                "ai_strength_analysis", 
                "ai_weakness_analysis"
            FROM users 
            WHERE id = $1
        `;
        const result = await sql.unsafe(queryText, [userId]);
        
        if (result.length === 0) {
            console.warn(`[BACKEND DB] Usuario no encontrado para ID '${userId}'.`);
            return NextResponse.json({ 
                message: 'Perfil de invocador no existe en la DB.',
                data: null
            }, { status: 404, headers: CORS_HEADERS });
        }
        
        const profile = result[0];
        
        // Añadir hfApiToken y riotApiKey (si existen en el ENV como fallback)
        // El cliente de Electron los gestiona si no vienen del servidor.
        if (!profile.hfApiToken && ENV_HF_TOKEN) {
            profile.hfApiToken = ENV_HF_TOKEN;
            console.log('[API USER/PROFILE] ℹ️ Usando HF Token de variable de entorno como fallback.');
        }

        // Si la columna riotApiKey no existe en la DB, el cliente la lee del Store, no la sobrescribimos.
        // Si el cliente necesita riotApiKey y no está en la DB, lo dejará en NULL o usará el Store de Electron.
        
        console.log(`[API USER/PROFILE] ✅ Perfil encontrado para usuario: ${profile.username}`);

        return NextResponse.json(profile, { status: 200, headers: CORS_HEADERS });

    } catch (error) {
        console.error("Error al obtener perfil del usuario (Postgres):", error);
        return NextResponse.json({ 
            message: 'Error interno del servidor al consultar DB.',
            details: error.message 
        }, { status: 500, headers: CORS_HEADERS });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}