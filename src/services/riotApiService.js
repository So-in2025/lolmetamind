// src/services/riotApiService.js
import axios from 'axios';
import { RIOT_API_KEY, RIOT_API_BASE_URL } from './apiConfig';

const riotApi = axios.create({
  baseURL: RIOT_API_BASE_URL,
  headers: {
    "X-Riot-Token": RIOT_API_KEY
  }
});

/**
 * Obtiene los datos de un invocador por su nombre.
 * @param {string} summonerName - El nombre del invocador.
 * @returns {Promise<object>} - Los datos del invocador.
 */
export const getSummonerByName = async (summonerName) => {
  try {
    const response = await riotApi.get(`/lol/summoner/v4/summoners/by-name/${summonerName}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching summoner data:', error.response.data);
    throw error;
  }
};

// TODO: Implementar más funciones para la API de Riot.
// Ejemplos:
// - getMatchHistory(puuid)
// - getLiveGame(summonerId)
// - getChampionMastery(summonerId)
