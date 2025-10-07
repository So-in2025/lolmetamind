import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
// Usar getSql para el driver 'postgres'
import { getSql } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'p2s5v8y/B?E(H+MbQeThWmZq4t7w!z%C&F)J@NcRfUjXn2r5u8x/A?D*G-KaPdSg';

// 🚨 DEFINICIÓN GLOBAL DE HEADERS CORS
// Se permite el origen específico de tu app Electron en desarrollo.
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': 'http://localhost:3001', // Origen de tu app Electron
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Función para manejar la petición OPTIONS (pre-vuelo de CORS)
export async function OPTIONS(request) {
    return new Response(null, {
        status: 204, // No Content
        headers: CORS_HEADERS,
    });
}

export async function POST(request) {
    const sql = getSql();
    const data = await request.json();

    // 1. Validar que no falten campos esenciales
    if (!data.username || !data.password || !data.summonerName || !data.tagline || !data.region || !data.zodiacSign || !data.favChamp1 || !data.favRole1) {
        return NextResponse.json({ message: 'Faltan datos obligatorios.' }, { status: 400, headers: CORS_HEADERS });
    }

    try {
        // 2. Hashear la contraseña
        const hashedPassword = await bcrypt.hash(data.password, 10);

        // 3. Crear el nuevo usuario en la base de datos
        const queryText = `
            INSERT INTO users (username, email, password_hash, rname, tagline, region, zodiac_sign, fav_champ1, fav_champ2, fav_role1, fav_role2)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, username;
        `;
        const values = [
            data.username, // $1: Username
            `${data.username.toLowerCase()}@metaminduser.com`, // $2: Email (placeholder)
            hashedPassword, // $3: Password Hash
            data.summonerName, // $4: Riot Name (rname)
            data.tagline, // $5: Tagline
            data.region, // $6: Region
            data.zodiacSign, // $7: Zodiac Sign
            data.favChamp1, // $8: Champ 1
            data.favChamp2 || null, // $9: Champ 2
            data.favRole1, // $10: Role 1
            data.favRole2 || null // $11: Role 2
        ];

        const result = await sql.unsafe(queryText, values);
        const user = result[0];

        // 4. Generar el Token JWT
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

        return NextResponse.json({ message: 'Registro exitoso', token }, { status: 201, headers: CORS_HEADERS });

    } catch (e) {
        // Manejo de errores específicos y genéricos con headers CORS
        if (e.code === '23505') {
            return NextResponse.json({ message: 'El nombre de usuario o Riot ID ya está en uso.' }, { status: 409, headers: CORS_HEADERS });
        }
        console.error("Error en registro:", e);
        return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500, headers: CORS_HEADERS });
    }
}