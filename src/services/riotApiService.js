// src/services/riotApiService.js
import axios from 'axios';
import { RIOT_API_KEY } from './apiConfig';

// Mapeo de regiones de la app a las plataformas de la API de Riot
const regionToPlatformMap = {
  LAN: 'la1',
  LAS: 'la2',
  NA: 'na1',
  EUW: 'euw1',
  EUNE: 'eun1',
  KR: 'kr',
  JP: 'jp1',
  // Agrega otras regiones según sea necesario
};

const getRiotApi = (region) => {
  const platformId = regionToPlatformMap[region.toUpperCase()];
  if (!platformId) {
    throw new Error(`Región no válida: ${region}`);
  }
  
  const baseURL = `https://${platformId}.api.riotgames.com`;
  
  return axios.create({
    baseURL,
    headers: {
      "X-Riot-Token": RIOT_API_KEY
    }
  });
};

/**
 * Obtiene los datos de un invocador por su nombre y región.
 * @param {string} summonerName - El nombre del invocador.
 * @param {string} region - La región del invocador (ej: 'LAS', 'NA').
 * @returns {Promise<object>} - Los datos del invocador.
 */
export const getSummonerByName = async (summonerName, region) => {
  try {
    const riotApi = getRiotApi(region);
    const response = await riotApi.get(`/lol/summoner/v4/summoners/by-name/${summonerName}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching summoner data:', error.response ? error.response.data : error.message);
    throw error;
  }
};

/**
 * Obtiene la partida en vivo de un invocador por su ID.
 * @param {string} summonerId - El ID encriptado del invocador.
 * @param {string} region - La región del invocador.
 * @returns {Promise<object>} - Los datos de la partida en vivo.
 */
export const getLiveGameBySummonerId = async (summonerId, region) => {
  try {
    const riotApi = getRiotApi(region);
    const response = await riotApi.get(`/lol/spectator/v4/active-games/by-summoner/${summonerId}`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null; // Es normal no encontrar partida, no lo tratamos como un error fatal.
    }
    console.error('Error fetching live game data:', error.response ? error.response.data : error.message);
    throw error;
  }
};
