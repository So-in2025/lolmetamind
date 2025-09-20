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

export const getAccountByRiotId = async (gameName, tagLine, region) => {
    const api = createApi(`https://${getRegionalRoute(region)}.api.riotgames.com`);
    const response = await api.get(`/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${tagLine}`);
    return response.data;
};

export const getSummonerByPuuid = async (puuid, region) => {
    const api = createApi(`https://${getPlatformRoute(region)}.api.riotgames.com`);
    const response = await api.get(`/lol/summoner/v4/summoners/by-puuid/${puuid}`);
    return response.data;
};

/**
 * **FUNCIÓN A PRUEBA DE FALLOS DEFINITIVA**
 * SIEMPRE devolverá un array. No hay otra posibilidad.
 */
export const getChampionMastery = async (puuid, region) => {
    if (!puuid || !region) return []; // Seguridad adicional
    const api = createApi(`https://${getPlatformRoute(region)}.api.riotgames.com`);
    try {
        const response = await api.get(`/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=5`);
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error('Error al obtener maestría de campeones (ignorado, se devuelve array vacío):', error.message);
        return [];
    }
};

/**
 * **FUNCIÓN A PRUEBA DE FALLOS DEFINITIVA**
 * SIEMPRE devolverá un array.
 */
export const getMatchHistoryIds = async (puuid, region) => {
    if (!puuid || !region) return [];
    const api = createApi(`https://${getRegionalRoute(region)}.api.riotgames.com`);
    try {
        const response = await api.get(`/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=420&start=0&count=5`);
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error('Error al obtener historial de partidas (ignorado, se devuelve array vacío):', error.message);
        return [];
    }
};

export const getMatchDetails = async (matchId, region) => {
    const api = createApi(`https://${getRegionalRoute(region)}.api.riotgames.com`);
    const response = await api.get(`/lol/match/v5/matches/${matchId}`);
    return response.data;
};
