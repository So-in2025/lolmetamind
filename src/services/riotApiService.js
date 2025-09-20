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
 * **FUNCIÓN A PRUEBA DE FALLOS**
 * Obtiene los campeones con mayor maestría. Si Riot no devuelve datos o la
 * llamada falla, ESTA FUNCIÓN SIEMPRE DEVOLVERÁ UN ARRAY VACÍO.
 */
export const getChampionMastery = async (puuid, region) => {
    const platformRoute = getPlatformRoute(region);
    const api = createApi(`https://${platformRoute}.api.riotgames.com`);
    try {
        const response = await api.get(`/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=5`);
        // Asegura que si la respuesta es exitosa pero no es un array (ej. nulo o vacío), devuelve [].
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error('Error al obtener maestría de campeones (se devolverá un array vacío para proteger el sistema):', error.response?.data || error.message);
        // Si la llamada falla por cualquier motivo, devolvemos un array vacío.
        return [];
    }
};

/**
 * **FUNCIÓN A PRUEBA DE FALLOS**
 * Obtiene el historial de partidas. Devuelve un array vacío en caso de error.
 */
export const getMatchHistoryIds = async (puuid, region) => {
    const regionalRoute = getRegionalRoute(region);
    const api = createApi(`https://${regionalRoute}.api.riotgames.com`);
    try {
        const response = await api.get(`/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=420&start=0&count=5`);
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error('Error al obtener historial de partidas (se devolverá un array vacío):', error.response?.data || error.message);
        return [];
    }
};

export const getMatchDetails = async (matchId, region) => {
    const regionalRoute = getRegionalRoute(region);
    const api = createApi(`https://${regionalRoute}.api.riotgames.com`);
    const response = await api.get(`/lol/match/v5/matches/${matchId}`);
    return response.data;
};
