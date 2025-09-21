#!/bin/bash

# ==============================================================================
# SCRIPT DE INGENIERÍA DEFINITIVA - LOL METAMIND
#
# Objetivo: Re-escribir la lógica de vinculación de perfil para usar un
#           método alternativo y más robusto, solucionando el problema del
#           'summoner_id' faltante.
# ==============================================================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Aplicando re-ingeniería final al flujo de vinculación de perfil...${NC}"

# --- 1. Añadir la nueva función getSummonerByName al servicio de la API ---
echo -e "\n${CYAN}[PASO 1/2] Mejorando 'src/services/riotApiService.js'...${NC}"
cat << 'EOF' > src/services/riotApiService.js
import axios from 'axios';
import { RIOT_API_KEY } from './apiConfig';

const REGIONAL_ROUTES = {
    americas: ['NA', 'BR', 'LAN', 'LAS'],
    asia: ['KR', 'JP'],
    europe: ['EUNE', 'EUW', 'TR', 'RU'],
};
const getRegionalRoute = (region) => {
    for (const route in REGIONAL_ROUTES) {
        if (REGIONAL_ROUTES[route].includes(region?.toUpperCase())) return route;
    }
    return 'americas';
};
const getPlatformRoute = (region) => {
    const platformRoutes = { LAN: 'la1', LAS: 'la2', NA: 'na1', EUW: 'euw1', EUNE: 'eun1', KR: 'kr', JP: 'jp1' };
    return platformRoutes[region?.toUpperCase()];
};
const createApi = (baseURL) => axios.create({ baseURL, headers: { "X-Riot-Token": RIOT_API_KEY } });

const handleApiError = (error, functionName) => {
    console.error(`ERROR CRÍTICO en ${functionName}:`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
    });
    throw new Error(`Fallo en ${functionName}: ${error.response?.data?.status?.message || error.message}`);
};

export const getAccountByRiotId = async (gameName, tagLine, region) => {
    try {
        const api = createApi(`https://${getRegionalRoute(region)}.api.riotgames.com`);
        const response = await api.get(`/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${tagLine}`);
        if (!response.data || !response.data.puuid) {
            throw new Error('La respuesta de Riot para la cuenta no contiene un PUUID válido.');
        }
        return response.data;
    } catch (error) {
        handleApiError(error, 'getAccountByRiotId');
    }
};

// *** NUEVA FUNCIÓN MÁS DIRECTA Y ROBUSTA ***
export const getSummonerByName = async (name, region) => {
    try {
        const api = createApi(`https://${getPlatformRoute(region)}.api.riotgames.com`);
        const response = await api.get(`/lol/summoner/v4/summoners/by-name/${encodeURIComponent(name)}`);
        if (!response.data || !response.data.id || !response.data.puuid) {
            throw new Error(`La respuesta de Riot no contiene los datos esperados (ID y PUUID) para el invocador ${name}.`);
        }
        return response.data;
    } catch (error) {
        handleApiError(error, 'getSummonerByName');
    }
};

export const getChampionMastery = async (puuid, region) => {
    if (!puuid || !region) return [];
    try {
        const api = createApi(`https://${getPlatformRoute(region)}.api.riotgames.com`);
        const response = await api.get(`/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=5`);
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error("Fallo al obtener maestría (ignorado para no romper UI):", error.message);
        return [];
    }
};

export const getMatchHistoryIds = async (puuid, region) => {
    if (!puuid || !region) return [];
    try {
        const api = createApi(`https://${getRegionalRoute(region)}.api.riotgames.com`);
        const response = await api.get(`/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=420&start=0&count=5`);
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error("Fallo al obtener historial (ignorado para no romper UI):", error.message);
        return [];
    }
};

export const getMatchDetails = async (matchId, region) => {
    try {
        const api = createApi(`https://${getRegionalRoute(region)}.api.riotgames.com`);
        const response = await api.get(`/lol/match/v5/matches/${matchId}`);
        return response.data;
    } catch (error) {
        handleApiError(error, 'getMatchDetails');
    }
};
EOF
echo -e "${GREEN}Éxito. 'riotApiService.js' reconstruido con un nuevo método. ✅${NC}"

# --- 2. Re-escribir la API de perfil para usar la nueva lógica de vinculación ---
echo -e "\n${CYAN}[PASO 2/2] Re-escribiendo la lógica de '/api/user/profile'...${NC}"
cat << 'EOF' > src/app/api/user/profile/route.js
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { getAccountByRiotId, getSummonerByName } from '@/services/riotApiService';

const JWT_SECRET = process.env.JWT_SECRET;
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const { gameName, tagLine, region } = await request.json();
    if (!gameName || !tagLine || !region) {
      return NextResponse.json({ error: 'Nombre de juego, tagline y región son requeridos' }, { status: 400 });
    }

    // *** NUEVA LÓGICA DE VINCULACIÓN ROBUSTA ***
    
    // 1. Obtener la cuenta para asegurar que el Riot ID es válido y obtener el PUUID oficial.
    const accountData = await getAccountByRiotId(gameName, tagLine, region);
    const officialPuuid = accountData.puuid;

    // 2. Obtener los datos del invocador directamente por nombre (método más fiable).
    const summonerData = await getSummonerByName(gameName, region);
    const { id: summoner_id, puuid: summonerPuuid } = summonerData;

    // 3. Verificación cruzada: Asegurarnos de que el PUUID coincide en ambos endpoints.
    if (officialPuuid !== summonerPuuid) {
        throw new Error("Inconsistencia de datos en la API de Riot. El PUUID del Riot ID no coincide con el del Invocador.");
    }

    const result = await pool.query(
      `UPDATE users 
       SET riot_id_name = $1, riot_id_tagline = $2, region = $3, puuid = $4, summoner_id = $5, updated_at = NOW() 
       WHERE id = $6 
       RETURNING id, username, email, riot_id_name, riot_id_tagline, region, puuid`,
      [gameName, tagLine, region, officialPuuid, summoner_id, userId]
    );

    return NextResponse.json({ message: 'Perfil actualizado con éxito', user: result.rows[0] });

  } catch (error) {
    console.error('Error al actualizar perfil:', error.message);
    return NextResponse.json({ error: `No se pudo vincular el perfil. Razón: ${error.message}` }, { status: 500 });
  }
}
EOF
echo -e "${GREEN}Éxito. La API de perfil ahora usa el nuevo método de vinculación. ✅${NC}"

echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "SOLUCIÓN DE INGENIERÍA APLICADA. ✅"
echo -e "La lógica ha sido corregida de raíz."
echo -e "----------------------------------------------------------------------${NC}"