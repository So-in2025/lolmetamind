import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
// Usar getSql para el driver 'postgres'
import { getSql } from '@/lib/db'; 

// 🔑 CLAVE: Usamos una clave de fallback ÚNICA para asegurar la consistencia.
const JWT_SECRET = process.env.JWT_SECRET || 'p2s5v8y/B?E(H+MbQeThWmZq4t7w!z%C&F)J@NcRfUjXn2r5u8x/A?D*G-KaPdSg';

// 🚨 DEFINICIÓN GLOBAL DE HEADERS CORS
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(request) {
    const sql = getSql();
    const data = await request.json();

    if (!data.username || !data.password) {
        // 🚨 CORRECCIÓN: Aplicar HEADERS al error 400
        return NextResponse.json({ message: 'Faltan credenciales.' }, { status: 400, headers: CORS_HEADERS });
    }

    try {
        // 1. Buscar usuario por nombre de usuario
        const queryText = 'SELECT id, username, password_hash FROM users WHERE username = $1';
        
        const result = await sql.unsafe(queryText, [data.username]);
        const user = result[0]; 

        if (!user) {
            // 🚨 CORRECCIÓN: Aplicar HEADERS al error 401
            return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401, headers: CORS_HEADERS });
        }

        // 2. Comparar contraseña hasheada
        const isPasswordValid = await bcrypt.compare(data.password, user.password_hash);
        if (!isPasswordValid) {
            // 🚨 CORRECCIÓN: Aplicar HEADERS al error 401
            return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401, headers: CORS_HEADERS });
        }

        // 3. Generar el Token JWT usando la clave única
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

        // 🚨 CORRECCIÓN: Aplicar HEADERS a la respuesta exitosa 200
        return NextResponse.json({ message: 'Login exitoso', token }, { status: 200, headers: CORS_HEADERS });

    } catch (error) {
        console.error("Error en login:", error);
        // 🚨 CORRECCIÓN: Aplicar HEADERS al error 500
        return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500, headers: CORS_HEADERS });
    }
}

/**
 * Handler OPTIONS necesario para peticiones CORS (Cross-Origin)
 */
export async function OPTIONS() {
    // 🚨 CORRECCIÓN: Usar la variable CORS_HEADERS
    return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}