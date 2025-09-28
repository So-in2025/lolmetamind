import { NextResponse, NextRequest } from 'next/server';
import jwt from 'jsonwebtoken'; // 🔑 Importar la librería JWT estándar
import { getPool } from '@/lib/db';

// 🚨 CLAVE: Usamos la misma clave de fallback ÚNICA para la verificación.
const JWT_SECRET = process.env.JWT_SECRET || 'CLAVE_SECRETA_UNICA_DE_RENDER_DB_TESTING';

// Helper para verificar el token del encabezado (Replicado de /api/user/profile)
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

// Encabezados CORS para todas las respuestas
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};


export async function POST(req) {
    // 1. Autenticación usando el helper estándar
    const decodedToken = authenticateUser(req);
    
    // Si la autenticación falla, se devuelve el 401.
    if (!decodedToken) {
        return NextResponse.json({ message: 'Token JWT inválido o ausente en el encabezado.' }, { status: 401, headers: CORS_HEADERS });
    }

    try {
        const db = getPool();
        const liveGameData = await req.json();
        const matchId = liveGameData.gameId;
        
        // Aquí iría la lógica para insertar o actualizar en la tabla 'matches'
        // await db.query('INSERT INTO matches (...) VALUES (...)');

        // Usamos el ID del usuario verificado del token.
        console.log('Datos de partida en vivo recibidos para el usuario ID:', decodedToken.id, 'Username:', decodedToken.username);
        
        // 2. Respuesta de éxito
        return NextResponse.json({ message: 'Datos de partida recibidos' }, { status: 200, headers: CORS_HEADERS });
        
    } catch (error) {
        console.error('Error al actualizar datos de la partida:', error);
        return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500, headers: CORS_HEADERS });
    }
}

// Handler OPTIONS necesario para peticiones CORS
export async function OPTIONS() {
    return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}