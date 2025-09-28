import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPool } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'p2s5v8y/B?E(H+MbQeThWmZq4t7w!z%C&F)J@NcRfUjXn2r5u8x/A?D*G-KaPdSg';

export async function POST(request) {
    const db = getPool();
    const data = await request.json();

    // 1. Validar que no falten campos esenciales
    if (!data.username || !data.password || !data.summonerName || !data.tagline || !data.region || !data.zodiacSign || !data.favChamp1 || !data.favRole1) {
        return NextResponse.json({ message: 'Faltan datos obligatorios.' }, { status: 400 });
    }

    try {
        // 2. Hashear la contraseña
        const hashedPassword = await bcrypt.hash(data.password, 10);

        // 3. Insertar el nuevo usuario en la base de datos
        const queryText = `
            INSERT INTO users (
                username, email, password_hash, riot_id_name, riot_id_tagline, region, zodiac_sign, 
                fav_champ1, fav_champ2, fav_role1, fav_role2, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
            RETURNING id, username;
        `;

        const values = [
            data.username, `${data.username}@placeholder.com`, hashedPassword, 
            data.summonerName, data.tagline, data.region, data.zodiacSign,
            data.favChamp1, data.favChamp2 || null, data.favRole1, data.favRole2 || null
        ];

        const result = await db.query(queryText, values);
        const user = result.rows[0];

        // 4. Generar el Token JWT
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

        const headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        };

        return NextResponse.json({ message: 'Registro exitoso', token }, { status: 201, headers });

    } catch (e) {
        if (e.code === '23505') { 
            return NextResponse.json({ message: 'El nombre de usuario ya está en uso.' }, { status: 409 });
        }
        console.error("Error en registro:", e);
        return NextResponse.json({ message: 'Error al registrar el usuario en la base de datos.' }, { status: 500 });
    }
}