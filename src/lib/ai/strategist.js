// src/lib/ai/strategist.js - VERSIÓN FINAL Y ROBUSTA

import { GEMINI_API_KEY } from '@/services/apiConfig';

/**
 * Función centralizada para comunicarse con la API de Gemini, ahora compatible con múltiples modelos.
 * @param {string} prompt - El prompt completo y listo para ser enviado a la IA.
 * @param {string} [modelName='gemini-1.5-flash-latest'] - El nombre del modelo a utilizar (opcional, por defecto 'gemini-1.5-flash-latest').
 * @returns {Promise<object>} - Una promesa que se resuelve con el objeto JSON de la IA.
 */
export const generateStrategicAnalysis = async (prompt, modelName = 'gemini-1.5-flash-latest') => {
  // 1. Validación de entrada robusta.
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    console.error('[Strategist] 🚨 Error: Se intentó llamar a la IA sin un prompt válido.');
    throw new Error('Se requiere un prompt para el análisis de la IA.');
  }

  // URL dinámica que cambia según el modelo solicitado.
  const API_URL = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

  try {
    console.log(`[Strategist] Enviando prompt a ${modelName}...`);

    // Objeto base para la configuración de la generación.
    const generationConfig = {};

    // 💡 LA CORRECCIÓN CLAVE ESTÁ AQUÍ:
    // Solo añadimos el parámetro 'response_mime_type' si el modelo es compatible.
    if (modelName.includes('1.5-flash')) {
      generationConfig.response_mime_type = "application/json";
    }

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
        // Asignamos la configuración que acabamos de crear.
        generationConfig: generationConfig,
      }),
    });

    const responseData = await response.json();

    // 2. Manejo de errores de la API mejorado.
    if (!response.ok) {
      const errorDetails = responseData.error ? JSON.stringify(responseData.error) : 'Sin detalles adicionales.';
      console.error(`[Strategist] 🚨 Error de la API de Gemini: ${response.status} - ${errorDetails}`);
      throw new Error(`La API de Gemini devolvió un error: ${response.status}`);
    }

    // 3. Extracción y parseo del texto JSON de la respuesta.
    const rawText = responseData.candidates[0].content.parts[0].text;
    
    console.log('[Strategist] ✅ Respuesta recibida de Gemini. Parseando...');
    
    // El parseo es seguro porque si el modelo es antiguo, devolverá un JSON de todas formas (según tus prompts).
    return JSON.parse(rawText);

  } catch (error) {
    // Capturamos tanto los errores de red como los de parseo.
    console.error(`[Strategist] 🚨 Fallo catastrófico al generar análisis: ${error.message}`);
    throw new Error('No se pudo completar el análisis de la IA.');
  }
};