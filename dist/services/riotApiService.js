"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getSummonerByPuuid = exports.getSummonerByName = exports.getMatchHistoryIds = exports.getMatchDetails = exports.getChampionMastery = exports.getAccountByRiotId = void 0;
var _axios = _interopRequireDefault(require("axios"));
var _apiConfig = require("./apiConfig");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const REGIONAL_ROUTES = {
  americas: ['NA', 'BR', 'LAN', 'LAS'],
  asia: ['KR', 'JP'],
  europe: ['EUNE', 'EUW', 'TR', 'RU']
};
const getRegionalRoute = region => {
  for (const route in REGIONAL_ROUTES) {
    if (REGIONAL_ROUTES[route].includes(region?.toUpperCase())) return route;
  }
  return 'americas';
};
const getPlatformRoute = region => {
  const platformRoutes = {
    LAN: 'la1',
    LAS: 'la2',
    NA: 'na1',
    EUW: 'euw1',
    EUNE: 'eun1',
    KR: 'kr',
    JP: 'jp1'
  };
  return platformRoutes[region?.toUpperCase()];
};
const createApi = baseURL => _axios.default.create({
  baseURL,
  headers: {
    "X-Riot-Token": _apiConfig.RIOT_API_KEY
  }
});
const handleApiError = (error, functionName) => {
  console.error(`ERROR CRÍTICO en ${functionName}:`, {
    message: error.message,
    status: error.response?.status,
    data: error.response?.data,
    url: error.config?.url
  });
  throw new Error(`Fallo en ${functionName}: ${error.response?.data?.status?.message || error.message}`);
};
const getAccountByRiotId = async (gameName, tagLine, region) => {
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
exports.getAccountByRiotId = getAccountByRiotId;
const getSummonerByName = async (name, region) => {
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

// --- FUNCIÓN AÑADIDA PARA CORREGIR EL ERROR ---
exports.getSummonerByName = getSummonerByName;
const getSummonerByPuuid = async (puuid, region) => {
  try {
    const api = createApi(`https://${getPlatformRoute(region)}.api.riotgames.com`);
    const response = await api.get(`/lol/summoner/v4/summoners/by-puuid/${puuid}`);
    if (!response.data || !response.data.id) {
      throw new Error('La respuesta de Riot no contiene un ID de invocador válido para el PUUID proporcionado.');
    }
    return response.data;
  } catch (error) {
    handleApiError(error, 'getSummonerByPuuid');
  }
};
// --- FIN DE LA CORRECCIÓN ---
exports.getSummonerByPuuid = getSummonerByPuuid;
const getChampionMastery = async (puuid, region) => {
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
exports.getChampionMastery = getChampionMastery;
const getMatchHistoryIds = async (puuid, region) => {
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
exports.getMatchHistoryIds = getMatchHistoryIds;
const getMatchDetails = async (matchId, region) => {
  try {
    const api = createApi(`https://${getRegionalRoute(region)}.api.riotgames.com`);
    const response = await api.get(`/lol/match/v5/matches/${matchId}`);
    return response.data;
  } catch (error) {
    handleApiError(error, 'getMatchDetails');
  }
};
exports.getMatchDetails = getMatchDetails;