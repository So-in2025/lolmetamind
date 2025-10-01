// src/app/api/user/profile/route.js - CORREGIDO PARA USAR NOMBRES DE COLUMNA ACTUALIZADOS

import { NextResponse, NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { getSql } from '@/lib/db'; 

const JWT_SECRET = process.env.JWT_SECRET || 'p2s5v8y/B?E(H+MbQeThWmZq4t7w!z%C&F)J@NcRfUjXn2r5u8x/A?D*G-KaPdSg'; 

// Encabezados CORS
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Helper para extraer y verificar el token JWT del header
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

/**
 * Endpoint GET para obtener los datos de invocador del usuario autenticado.
 */
export async function GET(request) {
    const sql = getSql();
    const url = new URL(request.url);
    const username = url.searchParams.get('username'); 

    // 1. Autenticación
    const decodedToken = authenticateUser(request);
    
    if (!decodedToken || decodedToken.username !== username) {
        return NextResponse.json({ message: 'No autorizado o token inválido.' }, { status: 401, headers: CORS_HEADERS });
    }

    try {
        // 2. Consulta a la DB: USAMOS LOS NUEVOS NOMBRES DE COLUMNA (CamelCase)
        const queryText = `
            SELECT 
                id,
                username,
                TRIM(COALESCE("summonerName", ''))::TEXT AS "summonerName",         
                TRIM(COALESCE(tagline, ''))::TEXT AS tagline, 
                TRIM(COALESCE(region, ''))::TEXT AS region,
                TRIM(COALESCE("zodiacSign", ''))::TEXT AS "zodiacSign",
                TRIM(COALESCE("favRole1", ''))::TEXT AS "favRole1",
                TRIM(COALESCE("favRole2", ''))::TEXT AS "favRole2",
                TRIM(COALESCE("favChamp1", ''))::TEXT AS "favChamp1",
                TRIM(COALESCE("favChamp2", ''))::TEXT AS "favChamp2",
                TRIM(COALESCE(riot_api_key, ''))::TEXT AS "riotApiKey",
                puuid
            FROM users 
            WHERE username = $1
        `;
        const result = await sql.unsafe(queryText, [username]);
        
        // 3. Verificación de existencia de fila
        if (result.length === 0) {
            console.warn(`[BACKEND DB] Usuario no encontrado para '${username}'. Devolviendo 404.`);
            return NextResponse.json({ 
                message: 'Perfil de invocador no existe en la DB.',
                data: null
            }, { status: 404, headers: CORS_HEADERS });
        }
        
        const profile = result[0]; 

        // 4. Devolver los datos (éxito)
        // Usamos spread operator ya que los aliases SQL ya coinciden con los nombres de la respuesta.
        return NextResponse.json(profile, { status: 200, headers: CORS_HEADERS });

    } catch (error) {
        console.error("Error al obtener perfil del usuario (Postgres):", error);
        // Si hay un error de DB (como el 42703 que vimos antes), devolvemos 500 con detalles.
        return NextResponse.json({ 
            message: 'Error interno del servidor al consultar DB.',
            details: error.message 
        }, { status: 500, headers: CORS_HEADERS });
    }
}

/**
 * Handler OPTIONS necesario para peticiones CORS (Cross-Origin)
 */
export async function OPTIONS() {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    return new NextResponse(null, { status: 200, headers });
}