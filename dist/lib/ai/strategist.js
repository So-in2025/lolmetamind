"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.generateStrategicAnalysis = void 0;
var _apiConfig = require("../../services/apiConfig");
// src/lib/ai/strategist.js
// Adaptadores multi-proveedor para generar análisis de juego:
// Gemini (Google) y OpenAI (GPT), con manejo de errores y fallback automático.

/**
 * parseJSONResponse
 * Limpia el texto devuelto por la IA y lo parsea a JSON seguro.
 */
function parseJSONResponse(rawText, expectedType) {
  if (rawText.startsWith('```json')) rawText = rawText.slice(7);
  if (rawText.endsWith('```')) rawText = rawText.slice(0, -3);
  const startChar = expectedType === 'array' ? '[' : '{';
  const endChar = expectedType === 'array' ? ']' : '}';
  const startIndex = rawText.indexOf(startChar);
  const endIndex = rawText.lastIndexOf(endChar);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(`Estructura JSON no encontrada (${expectedType}). Texto devuelto: ${rawText}`);
  }
  const clean = rawText.substring(startIndex, endIndex + 1).trim();
  return JSON.parse(clean);
}

/**
 * Gemini Provider
 * Llama a la API de Google Gemini para generar contenido de IA.
 */
const geminiProvider = {
  name: 'Gemini',
  call: async (prompt, expectedType = 'object', modelName = 'gemini-2.0-flash') => {
    const API_URL = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${_apiConfig.GEMINI_API_KEY}`;
    const bodyPayload = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      safetySettings: [{
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_NONE"
      }, {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_NONE"
      }, {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_NONE"
      }, {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_NONE"
      }]
    };
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyPayload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(`Gemini error: ${response.status} - ${JSON.stringify(data.error || {})}`);
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Gemini devolvió respuesta vacía');
    return parseJSONResponse(rawText, expectedType);
  }
};

/**
 * OpenAI Provider
 * Llama a la API de OpenAI GPT para generar contenido de IA.
 */
const openAIProvider = {
  name: 'OpenAI',
  call: async (prompt, expectedType = 'object', modelName = 'gpt-4o-mini') => {
    const API_URL = 'https://api.openai.com/v1/chat/completions';
    const bodyPayload = {
      model: modelName,
      messages: [{
        role: 'user',
        content: prompt
      }],
      temperature: 0
    };
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${_apiConfig.OPENAI_API_KEY}`
      },
      body: JSON.stringify(bodyPayload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(`OpenAI error: ${response.status} - ${JSON.stringify(data.error || {})}`);
    const rawText = data.choices?.[0]?.message?.content;
    if (!rawText) throw new Error('OpenAI devolvió respuesta vacía');
    return parseJSONResponse(rawText, expectedType);
  }
};

/**
 * runStrategicAnalysis
 * Función central que intenta primero Gemini, luego OpenAI si Gemini falla.
 */
const generateStrategicAnalysis = async (prompt, expectedType = 'object') => {
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw new Error('Se requiere un prompt válido.');
  }
  const providers = [geminiProvider, openAIProvider];
  let lastError;
  for (const provider of providers) {
    try {
      console.log(`[Strategist] Intentando con ${provider.name}...`);
      const result = await provider.call(prompt, expectedType);
      console.log(`[Strategist] ✅ ${provider.name} respondió correctamente.`);
      return result;
    } catch (err) {
      console.warn(`[Strategist] ⚠️ ${provider.name} falló: ${err.message}`);
      lastError = err;
    }
  }
  throw lastError || new Error("Ningún proveedor pudo completar la tarea");
};
exports.generateStrategicAnalysis = generateStrategicAnalysis;