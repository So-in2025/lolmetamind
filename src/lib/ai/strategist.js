// src/lib/ai/strategist.js
import { GEMINI_API_KEY } from '../../services/apiConfig';
import { createInitialAnalysisPrompt } from './prompts';

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Genera un análisis estratégico basado en los datos de la partida llamando a la API de Gemini.
 * @param {object} playerData - Datos del jugador (summonerName, region, zodiacSign).
 * @returns {Promise<object>} - El análisis JSON generado por la IA.
 */
export const generateStrategicAnalysis = async (playerData) => {
  console.log("Iniciando análisis de IA con datos reales:", playerData);

  // TODO: En el futuro, estos datos vendrán de la API de Riot. Por ahora, los simulamos.
  const simulatedTeamData = {
    allies: [{ champion: "Malphite", role: "TOP" }, { champion: "Amumu", role: "JUNGLE" }],
    enemies: [{ champion: "Ezreal", role: "ADC" }, { champion: "Lux", role: "SUPPORT" }],
  };

  const prompt = createInitialAnalysisPrompt(playerData, simulatedTeamData);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Error en la respuesta de la API de Gemini:', response.status, errorBody);
      throw new Error(`Error de la API de Gemini: ${response.status}`);
    }

    const data = await response.json();
    
    // Extraer y limpiar el contenido JSON de la respuesta
    const rawText = data.candidates[0].content.parts[0].text;
    const jsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    console.log("Análisis JSON recibido de la IA:", jsonText);
    return JSON.parse(jsonText);

  } catch (error) {
    console.error('Error al generar análisis estratégico:', error);
    // Devolvemos un objeto de error estructurado para que el frontend pueda manejarlo.
    return {
      error: true,
      message: "El coach de IA no está disponible en este momento. Inténtalo de nuevo más tarde."
    };
  }
};
