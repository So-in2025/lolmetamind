import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
// Usar getSql para el driver 'postgres'
import { getSql } from '@/lib/db'; 

const JWT_SECRET = process.env.JWT_SECRET || 'p2s5v8y/B?E(H+MbQeThWmZq4t7w!z%C&F)J@NcRfUjXn2r5u8x/A?D*G-KaPdSg';

// DEFINICIÓN GLOBAL DE HEADERS CORS
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(request) {
    const sql = getSql(); 
    const data = await request.json();

    // 1. Validar que no falten campos esenciales
    // 🚨 CORRECCIÓN CLAVE: Volver a incluir data.summonerName como campo obligatorio.
    if (!data.username || !data.password || !data.summonerName || !data.tagline || !data.region || !data.zodiacSign || !data.favChamp1 || !data.favRole1) {
        return NextResponse.json({ message: 'Faltan datos obligatorios.' }, { status: 400, headers: CORS_HEADERS });
    }

    try {
        // 2. Hashear la contraseña
        const hashedPassword = await bcrypt.hash(data.password, 10);

        // 3. Insertar el nuevo usuario en la base de datos
        // 🚨 CORRECCIÓN CLAVE: $1 = username, $4 = summonerName (rname).
        const queryText = `
            INSERT INTO users (
                username, email, password_hash, rname, riot_id_tagline, region, zodiac_sign, 
                fav_champ1, fav_champ2, fav_role1, fav_role2, created_at, updated_at
            )
            VALUES (TRIM($1)::TEXT, $2, $3, TRIM($4)::TEXT, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
            RETURNING id, username;
        `;

        const values = [
            data.username, // $1: Nombre de usuario de la aplicación (e.g., 'jonathan')
            `${data.username}@placeholder.com`, // $2: Email
            hashedPassword, // $3: Password Hash
            data.summonerName, // $4: Riot Name (rname) (e.g., 'Jh0wner')
            data.tagline, // $5: Tagline
            data.region, // $6: Region
            data.zodiacSign, // $7: Zodiac Sign
            data.favChamp1, // $8: Champ 1
            data.favChamp2 || null, // $9: Champ 2
            data.favRole1, // $10: Role 1
            data.favRole2 || null // $11: Role 2
        ];

        // Ejecutar consulta con sql.unsafe()
        const result = await sql.unsafe(queryText, values);
        const user = result[0];

        // 4. Generar el Token JWT
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

        return NextResponse.json({ message: 'Registro exitoso', token }, { status: 201, headers: CORS_HEADERS });

    } catch (e) {
        // Aplicar HEADERS a todas las respuestas de error
        if (e.code === '23505') { 
            return NextResponse.json({ message: 'El nombre de usuario o Riot ID ya está en uso.' }, { status: 409, headers: CORS_HEADERS });
        }
        console.error("Error en registro:", e);
        return NextResponse.json({ message: 'Error al registrar el usuario en la base de datos.' }, { status: 500, headers: CORS_HEADERS });
    }
}

// Handler OPTIONS necesario
export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}