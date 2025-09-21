"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getChampionNameById = getChampionNameById;
var _axios = _interopRequireDefault(require("axios"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// Caché simple para no pedir los datos de campeones en cada solicitud.
let championDataCache = null;

/**
 * Obtiene los datos de todos los campeones del Data Dragon de Riot.
 * Cachea el resultado para evitar llamadas innecesarias.
 * @returns {Promise<object>} - Un objeto con los datos de todos los campeones.
 */
async function getChampionData() {
  if (championDataCache) {
    return championDataCache;
  }
  try {
    // Primero, obtenemos la última versión del juego
    const versionsResponse = await _axios.default.get('https://ddragon.leagueoflegends.com/api/versions.json');
    const latestVersion = versionsResponse.data[0];

    // Luego, obtenemos los datos de los campeones para esa versión
    const response = await _axios.default.get(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`);
    const champions = response.data.data;
    const championMap = {};
    // Creamos un mapa de ID -> Nombre para una búsqueda fácil
    for (const key in champions) {
      championMap[champions[key].key] = champions[key].name;
    }
    championDataCache = championMap;
    return championDataCache;
  } catch (error) {
    console.error("Error fetching champion data from Data Dragon:", error);
    throw new Error("Could not fetch champion data.");
  }
}

/**
 * Convierte un ID de campeón en su nombre.
 * @param {string|number} championId - El ID numérico del campeón.
 * @returns {Promise<string>} - El nombre del campeón.
 */
async function getChampionNameById(championId) {
  const championMap = await getChampionData();
  return championMap[championId] || `Unknown Champion (ID: ${championId})`;
}