import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
// 🚨 CORRECCIÓN: Usar getSql en lugar de getPool
import { getSql } from '@/lib/db'; 

// CLAVE: Usamos la misma clave de fallback ÚNICA
const JWT_SECRET = process.env.JWT_SECRET || 'CLAVE_SECRETA_UNICA_DE_RENDER_DB_TESTING'; 

// Encabezados CORS
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
 * Endpoint POST para recibir datos de la app de escritorio y actualizar la DB.
 * Recibe LCU/Riot API/Scraping data.
 */
export async function POST(request) {
    const sql = getSql(); // Use getSql
    
    const decodedToken = authenticateUser(request);
    
    if (!decodedToken) {
        return NextResponse.json({ message: 'No autorizado o token inválido.' }, { status: 401, headers: CORS_HEADERS });
    }

    try {
        const data = await request.json();
        const userId = decodedToken.id; 
        const username = decodedToken.username;

        // 1. Validar la estructura mínima de la data
        if (!data || !data.mode) {
             console.error(`[LIVE GAME UPDATE] [ERROR] Data recibida incompleta para usuario: ${username}`);
             return NextResponse.json({ message: 'Datos de juego incompletos.' }, { status: 400, headers: CORS_HEADERS });
        }

        // 2. Insertar/Actualizar los datos en la columna live_game_data (JSONB)
        const liveGameDataJson = JSON.stringify(data);
        
        const queryText = `
            UPDATE users
            SET 
                live_game_data = $1, 
                updated_at = NOW()
            WHERE id = $2
            RETURNING id;
        `;

        const values = [liveGameDataJson, userId];

        // Execute with sql.unsafe()
        await sql.unsafe(queryText, values);

        console.log(`[LIVE GAME UPDATE] [OK] Datos de partida en vivo actualizados. Mode: ${data.mode}. Usuario ID: ${userId} Username: ${username}`);
        
        return new NextResponse(null, { status: 204, headers: CORS_HEADERS });

    } catch (error) {
        console.error("Error al actualizar datos de la partida:", error);
        return NextResponse.json({ message: 'Error interno del servidor al procesar datos.' }, { status: 500, headers: CORS_HEADERS });
    }
}

/**
 * Handler OPTIONS necesario para peticiones CORS (Cross-Origin)
 */
export async function OPTIONS() {
    return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}