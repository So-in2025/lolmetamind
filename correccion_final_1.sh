#!/bin/bash

# ==============================================================================
# SCRIPT DE HOTFIX FINAL - ROBUSTEZ DE LA API DE RIOT
#
# Objetivo: 1. Solucionar el TypeError ('map' of undefined) en la ruta de
#              recomendación.
#           2. Modificar el servicio de la API de Riot para que maneje con
#              elegancia los casos en que no se encuentran datos de maestría,
#              devolviendo un array vacío en lugar de un error.
# ==============================================================================

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Haciendo más robusto el servicio de la API de Riot...${NC}"

# --- Actualizar riotApiService.js para manejar errores de maestría ---
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
        if (REGIONAL_ROUTES[route].includes(region.toUpperCase())) return route;
    }
    return 'americas';
};
const getPlatformRoute = (region) => {
    const platformRoutes = { LAN: 'la1', LAS: 'la2', NA: 'na1', EUW: 'euw1', EUNE: 'eun1', KR: 'kr', JP: 'jp1' };
    return platformRoutes[region.toUpperCase()];
};
const createApi = (baseURL) => axios.create({ baseURL, headers: { "X-Riot-Token": RIOT_API_KEY } });

export const getAccountByRiotId = async (gameName, tagLine, region) => {
    const regionalRoute = getRegionalRoute(region);
    const api = createApi(`https://${regionalRoute}.api.riotgames.com`);
    const response = await api.get(`/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${tagLine}`);
    return response.data;
};
export const getSummonerByPuuid = async (puuid, region) => {
    const platformRoute = getPlatformRoute(region);
    const api = createApi(`https://${platformRoute}.api.riotgames.com`);
    const response = await api.get(`/lol/summoner/v4/summoners/by-puuid/${puuid}`);
    return response.data;
};

/**
 * **FUNCIÓN CORREGIDA**
 * Obtiene los campeones con mayor maestría para un invocador.
 * Si no encuentra datos o hay un error, devuelve un array vacío para evitar que la aplicación se rompa.
 * @param {string} puuid - El PUUID del invocador.
 * @param {string} region - La región del invocador.
 * @returns {Promise<object[]>} - Una lista de los campeones con más maestría o un array vacío.
 */
export const getChampionMastery = async (puuid, region) => {
    const platformRoute = getPlatformRoute(region);
    const api = createApi(`https://${platformRoute}.api.riotgames.com`);
    try {
        const response = await api.get(`/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=5`);
        return response.data || []; // Devuelve los datos, o un array vacío si la respuesta es nula
    } catch (error) {
        console.error('Error fetching champion mastery (ignorado para el usuario, se devuelve array vacío):', error.response?.data || error.message);
        // En lugar de lanzar un error, devolvemos un array vacío.
        return [];
    }
};

export const getMatchHistoryIds = async (puuid, region) => {
    const regionalRoute = getRegionalRoute(region);
    const api = createApi(`https://${regionalRoute}.api.riotgames.com`);
    try {
        const response = await api.get(`/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=420&start=0&count=5`);
        return response.data || [];
    } catch (error) {
        console.error('Error fetching match history (se devuelve array vacío):', error.response?.data || error.message);
        return [];
    }
};
export const getMatchDetails = async (matchId, region) => {
    const regionalRoute = getRegionalRoute(region);
    const api = createApi(`https://${regionalRoute}.api.riotgames.com`);
    const response = await api.get(`/lol/match/v5/matches/${matchId}`);
    return response.data;
};
EOF
echo "Actualizado: src/services/riotApiService.js. ✅"

echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡ERROR DE RECOMENDACIÓN SOLUCIONADO! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Pasos Finales:${NC}"
echo -e "1.  Sube este cambio a tu repositorio."
echo -e "2.  Una vez Vercel se redespliegue, el error desaparecerá por completo."
echo -e "3.  Ahora, incluso si un usuario no tiene datos de maestría, la IA simplemente basará su recomendación en el perfil zodiacal y el meta, sin romper la aplicación."