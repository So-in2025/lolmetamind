import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPool } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'CLAVE_SECRETA_FUERTE_DEBES_CAMBIARLA';

export async function POST(request) {
    const db = getPool();
    const data = await request.json();

    if (!data.username || !data.password) {
        return NextResponse.json({ message: 'Faltan credenciales.' }, { status: 400 });
    }

    try {
        // 1. Buscar usuario por nombre de usuario
        const queryText = 'SELECT id, username, password_hash FROM users WHERE username = $1';
        const result = await db.query(queryText, [data.username]);
        const user = result.rows[0];

        if (!user) {
            return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 });
        }

        // 2. Comparar contraseña hasheada
        const isPasswordValid = await bcrypt.compare(data.password, user.password_hash);
        if (!isPasswordValid) {
            return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 });
        }

        // 3. Generar el Token JWT
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

        const headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        };

        return NextResponse.json({ message: 'Login exitoso', token }, { status: 200, headers });

    } catch (error) {
        console.error("Error en login:", error);
        return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
    }
}