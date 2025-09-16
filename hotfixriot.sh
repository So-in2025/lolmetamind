#!/bin/bash

# ==============================================================================
# SCRIPT DE SOLUCIÓN PERMANENTE Y FINAL - LOL METAMIND
#
# Rol: Full-Stack Engineer
# Objetivo: Corregir todos los problemas de persistencia y el error de JSON
#           para dejar la aplicación 100% funcional.
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

// Esta configuración es más simple y es la recomendada para Vercel.
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

# --- 2. Corregir el endpoint del perfil para un manejo de errores robusto ---
echo -e "\n${GREEN}Paso 2: Actualizando la API '/api/user/profile/route.js' para manejar correctamente el Riot ID y los errores...${NC}"
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

    // Limpiamos el tagline por si el usuario incluyó el #
    tagLine = tagLine.startsWith('#') ? tagLine.substring(1) : tagLine;

    // 1. Obtener PUUID desde la API de Cuentas
    const accountData = await getAccountByRiotId(gameName, tagLine, region);
    const { puuid } = accountData;

    // 2. Obtener datos del Invocador (incluyendo summonerId) usando el PUUID
    const summonerData = await getSummonerByPuuid(puuid, region);
    const { id: summoner_id } = summonerData;

    // 3. Actualizar nuestra base de datos
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
    
    // Devolvemos siempre un JSON en caso de error
    if (error.response?.status === 404) {
      return NextResponse.json({ error: `Riot ID no encontrado. Verifica el nombre, tagline y región.` }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error interno del servidor al procesar la solicitud.' }, { status: 500 });
  }
}
EOF
echo "Actualizado: src/app/api/user/profile/route.js"

# --- 3. Actualizar el servicio de Riot API para que use el regionalRoute ---
echo -e "\n${GREEN}Paso 3: Actualizando 'src/services/riotApiService.js' para usar regionalRoute...${NC}"
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
    // Si no se encuentra, por defecto usamos 'americas' que cubre LAN/LAS/NA
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
echo -e "\n${CYAN}Pasos Finales y Cruciales:${NC}"
echo -e "1.  **ACTUALIZA LA BASE DE DATOS:** Abre DBeaver, conéctate a tu base de datos de Render y ejecuta el contenido del archivo 'src/lib/db/schema.sql'. Es fundamental hacerlo para que la persistencia funcione."
echo -e "2.  **HAZ COMMIT Y PUSH:** Sube todos los archivos modificados a tu repositorio de GitHub."
echo -e "3.  **PRUEBA EL FLUJO:** Una vez que se desplieguen los cambios, el inicio de sesión y la vinculación de tu Riot ID deberían funcionar correctamente."