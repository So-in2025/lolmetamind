// src/lib/ai/strategist.js - VERSIÓN FINAL: ROBUSTA, ESCALABLE Y DINÁMICA

import { GEMINI_API_KEY } from '@/services/apiConfig';

/**
 * Función centralizada para comunicarse con la API de Gemini.
 * Implementa aislamiento de JSON para garantizar un parseo seguro y fiable,
 * adaptándose al tipo de estructura de datos esperada (objeto o array).
 *
 * @param {string} prompt - El prompt completo y listo para ser enviado a la IA.
 * @param {'object'|'array'} [expectedType='object'] - Define el tipo de JSON esperado ('object' para {...} o 'array' para [...]).
 * @param {string} [modelName='gemini-2.0-flash'] - Modelo de IA optimizado para baja latencia.
 * @returns {Promise<object>} - Una promesa que se resuelve con el objeto JSON de la IA.
 */
export const generateStrategicAnalysis = async (prompt, expectedType = 'object', modelName = 'gemini-2.0-flash') => {
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
    
    const candidate = responseData.candidates?.[0];
    const rawTextPart = candidate?.content?.parts?.[0]?.text;

    if (!rawTextPart) {
        console.error('[Strategist] 🚨 La respuesta del candidato fue bloqueada o está vacía.', responseData);
        throw new Error('La respuesta de la IA fue bloqueada por filtros de seguridad o está incompleta.');
    }
    
    let rawText = rawTextPart; 

    // --- AISLAMIENTO DE JSON EXPLÍCITO Y A PRUEBA DE FALLOS ---
    
    // 1. Limpieza de Markdown (patrón común de la IA)
    if (rawText.startsWith('```json')) {
      rawText = rawText.substring(7); 
    }
    if (rawText.endsWith('```')) {
      rawText = rawText.slice(0, -3);
    }
    
    // 2. Definir delimitadores basados en el tipo esperado (determinista)
    const startChar = expectedType === 'array' ? '[' : '{';
    const endChar = expectedType === 'array' ? ']' : '}';
    
    // 3. Aislar el bloque JSON completo (ignora texto antes o después)
    const startIndex = rawText.indexOf(startChar);
    const endIndex = rawText.lastIndexOf(endChar);
    
    // 4. Verificación de seguridad estructural
    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        console.error(`[Strategist] 🚨 La IA devolvió una estructura no esperada (${expectedType}).`, rawText);
        throw new Error(`La IA no devolvió la estructura JSON esperada (${expectedType}).`);
    }

    // 5. Recortar la cadena y limpiar
    rawText = rawText.substring(startIndex, endIndex + 1).trim();

    console.log('[Strategist] ✅ Respuesta recibida de Gemini. Parseando...');
    return JSON.parse(rawText);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido al procesar la respuesta.';
    console.error(`[Strategist] 🚨 Fallo catastrófico al generar análisis: ${errorMessage}`);
    throw new Error('No se pudo completar el análisis de la IA.');
  }
};
