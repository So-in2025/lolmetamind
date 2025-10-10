// src/app/api/user/profile/route.js - BLOQUE COMPLETO Y CORREGIDO FINAL (v2)

import { NextResponse, NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { getSql } from '@/lib/db';

// 🚨 CRÍTICO: La misma clave usada en Login y WebSocket Server.
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
        
        // 🚨 CRÍTICO: Leer el token de la DB y luego complementarlo con el ENV si es necesario.
        const ENV_HF_TOKEN = process.env.HUGGING_FACE_TOKEN || process.env.HF_API_TOKEN; 

        const queryText = `
            SELECT 
                id,
                username,
                "summonerName",
                tagline, 
                region,
                "zodiacSign",
                "favRole1",
                "favRole2",
                "favChamp1",
                "favChamp2",
                "riotApiKey",
                "hfApiToken"
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
        
        // 🚨 CRÍTICO: Sobrescribir el hfApiToken de la DB con el token de entorno SOLO SI el de la DB es null.
        // Esto permite que el cliente siempre tenga un token válido si el ENV existe.
        if (!profile.hfApiToken && ENV_HF_TOKEN) {
            profile.hfApiToken = ENV_HF_TOKEN;
            console.log('[API USER/PROFILE] ℹ️ Usando HF Token de variable de entorno como fallback.');
        }

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