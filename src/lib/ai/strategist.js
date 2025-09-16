// src/lib/ai/strategist.js
import { GEMINI_API_KEY } from '../../services/apiConfig';

/**
 * Genera un análisis estratégico basado en los datos de la partida.
 * @param {object} matchData - Datos de la partida obtenidos de la API de Riot.
 * @returns {Promise<string>} - El análisis generado por la IA.
 */
export const generateStrategicAnalysis = async (matchData) => {
  // TODO: Implementar la llamada a la API de Gemini Pro.
  // 1. Formatear los datos de 'matchData' en un prompt claro y conciso.
  //    Ejemplo de prompt: "Actúa como un coach experto de League of Legends. Analiza los siguientes datos de la partida y proporciona 3 consejos clave para el jugador X: ..."
  // 2. Realizar la petición a la API de Gemini con el prompt.
  // 3. Devolver la respuesta de texto generada.

  console.log("Datos de la partida para analizar:", matchData);

  // Simulación de respuesta de la IA
  return Promise.resolve(
    "Análisis de IA (simulado): El equipo enemigo tiene una composición débil contra engages fuertes. Busca oportunidades para iniciar peleas grupales alrededor de objetivos como el Dragón y el Barón."
  );
};
