#!/bin/bash

# ==============================================================================
# SCRIPT DE SOLUCIÓN PERMANENTE Y VERIFICADA - LOL METAMIND
#
# Rol: Arquitecto de Software
# Objetivo: Reconstruir las rutas de la API para resolver el error 405 y
#           garantizar que el manejo de errores devuelva JSON válido.
# ==============================================================================

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Iniciando la aplicación de la solución integral...${NC}"

# --- 1. Corregir la conexión a la base de datos para el frontend (Vercel) ---
echo -e "\n${GREEN}Paso 1: Simplificando 'src/lib/db/index.js' para Vercel y Render...${NC}"
cat << 'EOF' > src/lib/db/index.js
// src/lib/db/index.js
import { Pool } from 'pg';

let pool;

if (!pool) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
}

export default pool;
EOF
echo "Actualizado: src/lib/db/index.js"

# --- 2. Reconstruir el endpoint de login ---
echo -e "\n${GREEN}Paso 2: Creando el endpoint POST para /api/auth/login...${NC}"
mkdir -p src/app/api/auth/login
cat << 'EOF' > src/app/api/auth/login/route.js
// src/app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { comparePassword, createToken } from '@/lib/auth/utils';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const { password_hash, ...userToSign } = user;
    const token = createToken(userToSign);

    return NextResponse.json({ token, user: userToSign });
  } catch (error) {
    console.error('Error en el login:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
EOF
echo "Reconstruido: src/app/api/auth/login/route.js"

# --- 3. Reconstruir el endpoint de vinculación de perfil ---
echo -e "\n${GREEN}Paso 3: Creando el endpoint POST para /api/user/profile...${NC}"
mkdir -p src/app/api/user/profile
cat << 'EOF' > src/app/api/user/profile/route.js
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { getAccountByRiotId, getSummonerByPuuid } from '@/services/riotApiService';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    let { gameName, tagLine, region } = await request.json();
    if (!gameName || !tagLine || !region) {
      return NextResponse.json({ error: 'Nombre de juego, tagline y región son requeridos' }, { status: 400 });
    }

    tagLine = tagLine.startsWith('#') ? tagLine.substring(1) : tagLine;

    const accountData = await getAccountByRiotId(gameName, tagLine, region);
    const { puuid } = accountData;

    const summonerData = await getSummonerByPuuid(puuid, region);
    const { id: summoner_id } = summonerData;

    const result = await pool.query(
      `UPDATE users 
       SET riot_id_name = $1, riot_id_tagline = $2, region = $3, puuid = $4, summoner_id = $5, updated_at = NOW() 
       WHERE id = $6 
       RETURNING id, username, email, riot_id_name, riot_id_tagline, region`,
      [gameName, tagLine, region, puuid, summoner_id, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado en nuestra base de datos' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Perfil actualizado con éxito', user: result.rows[0] });

  } catch (error) {
    console.error('Error al actualizar perfil:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      return NextResponse.json({ error: `Riot ID no encontrado. Verifica el nombre, tagline y región.` }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error interno del servidor al procesar la solicitud.' }, { status: 500 });
  }
}
EOF
echo "Reconstruido: src/app/api/user/profile/route.js"

# --- 4. Actualizar el servicio de Riot API para que use el regionalRoute ---
echo -e "\n${GREEN}Paso 4: Actualizando 'src/services/riotApiService.js' para usar regionalRoute...${NC}"
cat << 'EOF' > src/services/riotApiService.js
// src/services/riotApiService.js
import axios from 'axios';
import { RIOT_API_KEY } from './apiConfig';

const REGIONAL_ROUTES = {
    americas: ['NA', 'BR', 'LAN', 'LAS'],
    asia: ['KR', 'JP'],
    europe: ['EUNE', 'EUW', 'TR', 'RU'],
};

const getRegionalRoute = (region) => {
    for (const route in REGIONAL_ROUTES) {
        if (REGIONAL_ROUTES[route].includes(region.toUpperCase())) {
            return route;
        }
    }
    return 'americas';
};

const getPlatformRoute = (region) => {
    const platformRoutes = { LAN: 'la1', LAS: 'la2', NA: 'na1', EUW: 'euw1', EUNE: 'eun1', KR: 'kr', JP: 'jp1' };
    return platformRoutes[region.toUpperCase()];
};

const createApi = (baseURL) => axios.create({
    baseURL,
    headers: { "X-Riot-Token": RIOT_API_KEY }
});

export const getAccountByRiotId = async (gameName, tagLine, region) => {
    const regionalRoute = getRegionalRoute(region);
    const api = createApi(`https://${regionalRoute}.api.riotgames.com`);
    try {
        const response = await api.get(`/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${tagLine}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching account by Riot ID:', error.response?.data || error.message);
        throw error;
    }
};

export const getSummonerByPuuid = async (puuid, region) => {
    const platformRoute = getPlatformRoute(region);
    const api = createApi(`https://${platformRoute}.api.riotgames.com`);
    try {
        const response = await api.get(`/lol/summoner/v4/summoners/by-puuid/${puuid}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching summoner by PUUID:', error.response?.data || error.message);
        throw error;
    }
};

export const getLiveGameBySummonerId = async (summonerId, region) => {
    const platformRoute = getPlatformRoute(region);
    const api = createApi(`https://${platformRoute}.api.riotgames.com`);
    try {
        const response = await api.get(`/lol/spectator/v4/active-games/by-summoner/${summonerId}`);
        return response.data;
    } catch (error) {
        if (error.response?.status === 404) return null;
        console.error('Error fetching live game data:', error.response?.data || error.message);
        throw error;
    }
};
EOF
echo "Actualizado: src/services/riotApiService.js"

echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡SOLUCIÓN INTEGRAL APLICADA! ✅"
echo -e "----------------------------------------------------------------------${NC}"
