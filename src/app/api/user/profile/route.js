import { NextResponse, NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { getSql } from '@/lib/db'; 

const JWT_SECRET = process.env.JWT_SECRET || 'CLAVE_SECRETA_UNICA_DE_RENDER_DB_TESTING';

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
        // 2. Consulta a la DB: 🚨 TÉCNICA FINAL DE DOBLE ALIAS PARA BYPASS DE CORRUPCIÓN 🚨
        // Leemos la columna problemática 'rname' dos veces con nuevos alias.
        const queryText = `
            SELECT 
                TRIM(COALESCE(rname, ''))::TEXT AS rname_a,         -- Primer intento (puede ser corrupto)
                TRIM(COALESCE(rname, ''))::TEXT AS rname_b,         -- Segundo intento (el valor de fallback)
                TRIM(COALESCE(riot_id_tagline, ''))::TEXT AS tagline, 
                TRIM(COALESCE(region, ''))::TEXT AS region
            FROM users 
            WHERE username = $1
        `;
        const result = await sql.unsafe(queryText, [username]);
        
        // 3. Verificación de existencia de fila
        if (result.length === 0) {
            console.warn(`[BACKEND DB] Usuario no encontrado en la tabla 'users'. Devolviendo 404.`);
            return NextResponse.json({ 
                message: 'Perfil de invocador no existe en la DB.',
                data: null
            }, { status: 404, headers: CORS_HEADERS });
        }
        
        const profile = result[0]; 

        // 4. AISLAMIENTO Y VERIFICACIÓN FINAL: Diagnóstico y limpieza
        
        let rawNameA = profile.rname_a || '';
        let rawNameB = profile.rname_b || '';
        
        // 🚨 BYPASS DE LECTURA: Usar el segundo alias si el primero (rname_a) es corrupto (Length 0).
        let rawSummonerName = (rawNameA.length === 0 && rawNameB.length > 0) ? rawNameB : rawNameA; 

        const rawTagline = profile.tagline || '';
        const rawRegion = profile.region || '';
        
        // Aplicar trim final para todos
        const summonerName = String(rawSummonerName).trim();
        const tagline = String(rawTagline).trim();
        const region = String(rawRegion).trim();
        
        
        if (summonerName.length === 0 || tagline.length === 0 || region.length === 0) {
            
            // 🚨 LOG DE DIAGNÓSTICO FINAL 🚨
            console.error(`[BACKEND DB] FALLO PERSISTENTE. Diagnóstico (Doble Alias):`);
            console.error(`[BACKEND DB] -> rname_a: Length ${rawNameA.length}, Value='${rawNameA}'`);
            console.error(`[BACKEND DB] -> rname_b: Length ${rawNameB.length}, Value='${rawNameB}'`);
            console.error(`[BACKEND DB] -> Name FINAL ('summonerName'): Length ${summonerName.length}, Value='${summonerName}'`);

            console.warn(`[BACKEND DB] Perfil de invocador incompleto (datos vacíos). Devolviendo 404.`);
            return NextResponse.json({ 
                message: 'Perfil de invocador incompleto o no existe.',
                data: { summonerName, tagline, region } 
            }, { status: 404, headers: CORS_HEADERS });
        }

        // 5. Devolver los datos (éxito)
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