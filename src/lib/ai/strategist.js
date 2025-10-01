// src/lib/ai/strategist.js
import { GEMINI_API_KEY } from '@/services/apiConfig';
// Importamos TODOS los prompts que podríamos necesitar
import { 
    createInitialAnalysisPrompt, 
    createChallengeGenerationPrompt, 
    createLiveCoachingPrompt,
    createChampSelectPrompt,
    createPerformanceAnalysisPrompt,
    createMetaAnalysisPrompt
} from './prompts';

// 🚨 CORRECCIÓN CLAVE: Cambiar el nombre del modelo
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`; 
// NOTA: Si 'gemini-2.5-flash' no funciona, prueba con 'gemini-1.5-pro-latest' o 'gemini-1.0-pro' 
// o el modelo que tu clave soporte y que permita 'responseMimeType: "application/json"'.

/**
 * Función central para generar análisis enviando un prompt a la API de Gemini.
 * @param {object} analysisData - Objeto que contiene el prompt a enviar.
 * @param {string} analysisData.customPrompt - El prompt completo y listo para la IA.
 * @returns {Promise<object>} - Una promesa que se resuelve con el objeto JSON de la IA.
 */
export const generateStrategicAnalysis = async (prompt) => {
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    console.error('[Strategist] Error: No se proporcionó un prompt válido.');
    throw new Error('Se requiere un prompt para el análisis.');
  }

  try {
    console.log('[Strategist] Enviando prompt a Gemini 1.5 Flash...');
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ],
        generationConfig: {
            responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Strategist] Error de la API de Gemini: ${response.status} - ${errorBody}`);
      throw new Error(`La API de Gemini devolvió un error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.candidates[0].content.parts[0].text;
    const jsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    console.log('[Strategist] ✅ Respuesta JSON recibida y parseada de Gemini.');
    return JSON.parse(jsonText);

  } catch (error) {
    console.error('[Strategist] 🚨 Fallo catastrófico al generar análisis:', error);
    throw new Error('No se pudo completar el análisis de la IA.');
  }
};