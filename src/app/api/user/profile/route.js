// src/app/api/user/profile/route.js
import { NextResponse, NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { getPool } from '@/lib/db';

// 🔑 CLAVE: Usamos la misma clave de fallback ÚNICA que el login.
const JWT_SECRET = process.env.JWT_SECRET || 'CLAVE_SECRETA_UNICA_DE_RENDER_DB_TESTING';

// Encabezados CORS para todas las respuestas
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
    const db = getPool();
    const url = new URL(request.url);
    const username = url.searchParams.get('username'); 

    // 1. Autenticación
    const decodedToken = authenticateUser(request);
    
    if (!decodedToken || decodedToken.username !== username) {
        return NextResponse.json({ message: 'No autorizado o token inválido.' }, { status: 401, headers: CORS_HEADERS });
    }

    try {
        // 2. Consulta a la DB de Render para obtener los datos clave del invocador
        // Usamos COALESCE para convertir NULL en '' (cadena vacía)
        const queryText = `
            SELECT 
                COALESCE(riot_id_name, '') AS summonerName, 
                COALESCE(riot_id_tagline, '') AS tagline, 
                COALESCE(region, '') AS region 
            FROM users 
            WHERE username = $1
        `;
        const result = await db.query(queryText, [username]);
        
        // 3. Verificación de existencia de fila
        if (result.rows.length === 0) {
            console.warn(`[BACKEND DB] Usuario no encontrado en la tabla 'users'. Devolviendo 404.`);
            return NextResponse.json({ 
                message: 'Perfil de invocador no existe en la DB.',
                data: null
            }, { status: 404, headers: CORS_HEADERS });
        }
        
        const profile = result.rows[0]; 

        // 4. AISLAMIENTO Y VERIFICACIÓN FINAL: Chequeamos que las cadenas no estén vacías.
        const summonerName = profile.summonerName || '';
        const tagline = profile.tagline || '';
        const region = profile.region || '';
        
        if (summonerName.length === 0 || tagline.length === 0 || region.length === 0) {
            
            console.warn(`[BACKEND DB] Perfil de invocador incompleto (datos vacíos). Devolviendo 404.`);
            return NextResponse.json({ 
                message: 'Perfil de invocador incompleto o no existe.',
                data: { summonerName, tagline, region } // Devolver la data cruda para diagnóstico
            }, { status: 404, headers: CORS_HEADERS });
        }

        // 5. Devolver los datos
        return NextResponse.json({ summonerName, tagline, region }, { status: 200, headers: CORS_HEADERS });

    } catch (error) {
        // Esto captura el error si la conexión a la DB falla o hay un error de lógica mayor.
        console.error("Error al obtener perfil del usuario:", error);
        return NextResponse.json({ message: 'Error interno del servidor al consultar DB.' }, { status: 500, headers: CORS_HEADERS });
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