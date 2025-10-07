// src/app/api/user/profile/route.js - BLOQUE COMPLETO Y CORREGIDO FINAL

import { NextResponse, NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { getSql } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'p2s5v8y/B?E(H+MbQeThWmZq4t7w!z%C&F)J@NcRfUjXn2r5u8x/A?D*G-KaPdSg';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': 'http://localhost:3001',
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
    const sql = getSql();
    const decodedToken = authenticateUser(request);
    
    if (!decodedToken || !decodedToken.id) {
        return NextResponse.json({ message: 'No autorizado o token inválido.' }, { status: 401, headers: CORS_HEADERS });
    }

    try {
        const userId = decodedToken.id;

        // ▼▼▼ CORRECCIÓN: TOKEN SE LEE DESDE ENV ▼▼▼
        const hfApiToken = process.env.HF_API_TOKEN; // ← leer de .env, no hardcodear

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
                $2 AS "hfApiToken",  -- ← usar parámetro en vez de hardcode
                puuid
            FROM users 
            WHERE id = $1
        `;
        const result = await sql.unsafe(queryText, [userId, hfApiToken]);
        
        if (result.length === 0) {
            console.warn(`[BACKEND DB] Usuario no encontrado para ID '${userId}'.`);
            return NextResponse.json({ 
                message: 'Perfil de invocador no existe en la DB.',
                data: null
            }, { status: 404, headers: CORS_HEADERS });
        }
        
        const profile = result[0];

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
