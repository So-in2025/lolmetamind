// src/lib/ai/strategist.js - VERSIÓN FINAL CON MODELO CORROBORADO Y PARSEO CORREGIDO

import { GEMINI_API_KEY } from '@/services/apiConfig';

/**
 * Función centralizada para comunicarse con la API de Gemini.
 * @param {string} prompt - El prompt completo y listo para ser enviado a la IA.
 * @param {string} [modelName='gemini-2.0-flash'] - El nombre del modelo a utilizar. Se usa uno de la lista confirmada.
 * @returns {Promise<object>} - Una promesa que se resuelve con el objeto JSON de la IA.
 */
export const generateStrategicAnalysis = async (prompt, modelName = 'gemini-2.0-flash') => {
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    console.error('[Strategist] 🚨 Error: Se intentó llamar a la IA sin un prompt válido.');
    throw new Error('Se requiere un prompt para el análisis de la IA.');
  }

  const API_URL = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

  try {
    console.log(`[Strategist] Enviando prompt a ${modelName}...`);

    const bodyPayload = {
      contents: [{ parts: [{ text: prompt }] }],
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      ],
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      const errorDetails = responseData.error ? JSON.stringify(responseData.error) : 'Sin detalles adicionales.';
      console.error(`[Strategist] 🚨 Error de la API de Gemini: ${response.status} - ${errorDetails}`);
      throw new Error(`La API de Gemini devolvió un error: ${response.status}`);
    }
    
    if (!responseData.candidates || responseData.candidates.length === 0) {
      console.error('[Strategist] 🚨 La API devolvió una respuesta sin candidatos.', responseData);
      throw new Error('La respuesta de la IA no contiene candidatos.');
    }

    const candidate = responseData.candidates[0];
    if (!candidate.content || !candidate.content.parts || !candidate.content.parts[0]) {
      console.error('[Strategist] 🚨 La respuesta del candidato fue bloqueada por seguridad o está vacía.', candidate);
      throw new Error('La respuesta de la IA fue bloqueada por filtros de seguridad o está incompleta.');
    }

    let rawText = candidate.content.parts[0].text; // Declaración de 'rawText' con 'let'

    // --- CORRECCIÓN CLAVE: Eliminar el prefijo y sufijo de bloque de código Markdown si existen ---
    if (rawText.startsWith('```json')) {
      rawText = rawText.substring(7); // Elimina '```json\n'
    }
    if (rawText.endsWith('```')) {
      rawText = rawText.slice(0, -3); // Elimina '\n```'
    }
    rawText = rawText.trim(); // Limpia cualquier espacio o nueva línea extra

    console.log('[Strategist] ✅ Respuesta recibida de Gemini. Parseando...');
    return JSON.parse(rawText);

  } catch (error) {
    console.error(`[Strategist] 🚨 Fallo catastrófico al generar análisis: ${error.message}`);
    throw new Error('No se pudo completar el análisis de la IA.');
  }
};