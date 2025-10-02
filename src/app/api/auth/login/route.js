import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getSql } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'p2s5v8y/B?E(H+MbQeThWmZq4t7w!z%C&F)J@NcRfUjXn2r5u8x/A?D*G-KaPdSg';

// Objeto de cabeceras CORS para reutilizar
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': 'http://localhost:3001',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Manejador para la solicitud OPTIONS (pre-vuelo de CORS)
export async function OPTIONS(request) {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// Manejador para la solicitud POST (login)
export async function POST(request) {
    try {
        const sql = getSql();
        const data = await request.json();

        if (!data.username || !data.password) {
            return NextResponse.json(
                { message: 'Faltan credenciales.' },
                { status: 400, headers: CORS_HEADERS }
            );
        }

        const result = await sql.unsafe('SELECT id, username, password_hash FROM users WHERE username = $1', [data.username]);
        const user = result[0];

        if (!user) {
            return NextResponse.json(
                { message: 'Credenciales inválidas.' },
                { status: 401, headers: CORS_HEADERS }
            );
        }

        const isPasswordValid = await bcrypt.compare(data.password, user.password_hash);
        if (!isPasswordValid) {
            return NextResponse.json(
                { message: 'Credenciales inválidas.' },
                { status: 401, headers: CORS_HEADERS }
            );
        }

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

        return NextResponse.json(
            { message: 'Login exitoso', token },
            { status: 200, headers: CORS_HEADERS }
        );

    } catch (error) {
        console.error("Error en login:", error);
        return NextResponse.json(
            { message: 'Error interno del servidor.' },
            { status: 500, headers: CORS_HEADERS }
        );
    }
}