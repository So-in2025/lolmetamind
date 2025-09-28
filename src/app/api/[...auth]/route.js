import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// 🚨 CRÍTICO: El alias '@/lib/db' se resuelve a dist/lib/db/index.js
import { db } from '@/lib/db'; 

// 🚨 CONFIGURACIÓN: Reemplaza con tu clave secreta fuerte de tu .env
const JWT_SECRET = process.env.JWT_SECRET || 'CLAVE_SECRETA_FUERTE_DEBES_CAMBIARLA'; 

// --- MANEJADOR PRINCIPAL DE PETICIONES POST ---
export async function POST(request, { params }) {
    const action = params.auth[0]; // 'login' o 'register'
    const body = await request.json();
    
    // Validar datos básicos
    if (!body.username || !body.password) {
        return NextResponse.json({ message: 'Faltan credenciales básicas (usuario y contraseña).' }, { status: 400 });
    }

    try {
        switch (action) {
            case 'register':
                return handleRegister(body);
            case 'login':
                return handleLogin(body);
            default:
                return NextResponse.json({ message: 'Ruta de autenticación no válida.' }, { status: 404 });
        }
    } catch (error) {
        console.error(`Error en la ruta /api/auth/${action}:`, error);
        return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
    }
}

// --- LÓGICA DE REGISTRO (/register) ---
async function handleRegister(data) {
    // 1. Validar que no falten campos esenciales
    if (!data.summonerName || !data.tagline || !data.region || !data.zodiacSign || !data.favChamp1 || !data.favRole1) {
        return NextResponse.json({ message: 'Faltan datos obligatorios del perfil de Invocador.' }, { status: 400 });
    }
    
    // 2. Hashear la contraseña
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    // 3. Insertar el nuevo usuario en la base de datos (20 CAMPOS SIN OMISIONES)
    const queryText = `
        INSERT INTO users (
            username, email, password_hash, riot_id_name, riot_id_tagline, region, zodiac_sign, 
            fav_champ1, fav_champ2, fav_role1, fav_role2, created_at, updated_at
            -- Campos que quedan a DEFAULT o NULL: google_id, puuid, summoner_id, paddle_customer_id, live_game_data, avatar_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING id, username;
    `;
    
    const values = [
        data.username, 
        `${data.username}@placeholder.com`, // Usamos un PLACEHOLDER para EMAIL
        hashedPassword, 
        data.summonerName, // Mapeado a riot_id_name
        data.tagline,     // Mapeado a riot_id_tagline
        data.region, 
        data.zodiacSign,
        data.favChamp1, 
        data.favChamp2 || null, // Opcional (se inserta NULL si no se envió)
        data.favRole1, 
        data.favRole2 || null   // Opcional
    ];

    let result;
    try {
        // Ejecución en la base de datos
        result = await db.query(queryText, values);
    } catch (e) {
        if (e.code === '23505') { 
            return NextResponse.json({ message: 'El nombre de usuario ya está en uso.' }, { status: 409 });
        }
        return NextResponse.json({ message: 'Error al registrar el usuario en la base de datos.' }, { status: 500 });
    }

    const user = result.rows[0];
    
    // 4. Generar el Token JWT
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    return NextResponse.json({ message: 'Registro exitoso', token }, { status: 201 });
}

// --- LÓGICA DE LOGIN (/login) ---
async function handleLogin(data) {
    // 1. Buscar usuario por nombre de usuario
    // CRÍTICO: Debe traer el password_hash
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

    return NextResponse.json({ message: 'Login exitoso', token }, { status: 200 });
}

// --- LÓGICA DE RECUPERACIÓN DE CONTRASEÑA (Placeholder) ---
export async function GET(request, { params }) {
    const action = params.auth[0];
    if (action === 'forgot-password') {
        // Esto se expandirá a la lógica de envío de email
        return NextResponse.json({ message: 'Funcionalidad de recuperación de contraseña aún no implementada.' }, { status: 501 });
    }
    return NextResponse.json({ message: 'Ruta no encontrada.' }, { status: 404 });
}