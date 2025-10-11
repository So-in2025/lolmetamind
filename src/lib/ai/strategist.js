// src/lib/ai/strategist.js
// ============================================================
// 🧠 Strategist v5.2
// Multi-Provider AI Adapter (Gemini + OpenAI)
// - Fallback automático y logs PRO-DEV
// - Parsing robusto de JSON y manejo de errores refinado
// - Totalmente compatible con aiOrchestrator.js
// ============================================================

import { GEMINI_API_KEY, GEMINI_API_KEY_2, OPENAI_API_KEY, OPENAI_API_KEY_2 } from '@/services/apiConfig';
// ---------------------------
// Config
// ---------------------------
const DEFAULT_TEMPERATURE = 0;
const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
];

// ---------------------------
// 🧩 JSON Parsing Safe Utility
// ---------------------------
function parseJSONResponse(rawText, expectedType = 'object') {
  try {
    let text = rawText.trim();
    if (text.startsWith('```json')) text = text.slice(7);
    if (text.endsWith('```')) text = text.slice(0, -3);

    const startChar = expectedType === 'array' ? '[' : '{';
    const endChar = expectedType === 'array' ? ']' : '}';

    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
      throw new Error(`No se encontró estructura JSON válida.`);
    }

    const clean = text.substring(startIndex, endIndex + 1).trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('[Strategist] ❌ Error parseando JSON:', err.message);
    console.error('Texto devuelto:', rawText);
    throw new Error('Error al parsear JSON devuelto por la IA.');
  }
}

// ---------------------------
// ⚙️ Gemini Provider
// ---------------------------
const geminiProvider = {
  name: 'Gemini',
  call: async (prompt, expectedType = 'object', modelName = 'gemini-2.0-flash', key) => {
    const t0 = performance.now();
    const API_URL = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${key}`;

    const bodyPayload = {
      contents: [{ parts: [{ text: prompt }] }],
      safetySettings: SAFETY_SETTINGS,
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
    });

    const elapsed = (performance.now() - t0).toFixed(0);
    const data = await response.json();

    if (!response.ok) throw new Error(`Gemini error ${response.status}: ${JSON.stringify(data.error || {})}`);

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Gemini devolvió respuesta vacía');

    console.log(`[Strategist] ✅ Gemini OK (${modelName}) en ${elapsed}ms`);
    return parseJSONResponse(rawText, expectedType);
  },
};

// ---------------------------
// ⚙️ OpenAI Provider
// ---------------------------
const openAIProvider = {
  name: 'OpenAI',
  call: async (prompt, expectedType = 'object', modelName = 'gpt-4o-mini', key) => {
    const t0 = performance.now();
    const API_URL = 'https://api.openai.com/v1/chat/completions';

    const bodyPayload = {
      model: modelName,
      temperature: DEFAULT_TEMPERATURE,
      messages: [{ role: 'user', content: prompt }],
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,  // <---  USAMOS LA CLAVE
      },
      body: JSON.stringify(bodyPayload),
    });

    const elapsed = (performance.now() - t0).toFixed(0);
    const data = await response.json();

    if (!response.ok) throw new Error(`OpenAI error ${response.status}: ${JSON.stringify(data.error || {})}`);

    const rawText = data.choices?.[0]?.message?.content;
    if (!rawText) throw new Error('OpenAI devolvió respuesta vacía');

    console.log(`[Strategist] ✅ OpenAI OK (${modelName}) en ${elapsed}ms`);
    return parseJSONResponse(rawText, expectedType);
  },
};

// ---------------------------
// 🎯 Función Principal
// ---------------------------
export const generateStrategicAnalysis = async (
  prompt,
  expectedType = 'object',
  modelName = 'gemini-2.0-flash',
  geminiKeys = [], // Acepta un array de claves de Gemini
  openAIKeys = []  // Acepta un array de claves de OpenAI
) => {
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('Prompt vacío o inválido.');
  }

  const isGemini = modelName.startsWith('gemini');
  const providers = isGemini
    ? [geminiProvider, openAIProvider]
    : [openAIProvider, geminiProvider];

  let lastError;

  for (const provider of providers) {
    try {
      console.log(`[Strategist] 🔍 Intentando con ${provider.name} (${modelName})...`);
      const result = await provider.call(prompt, expectedType, modelName, key || null);
      providerUsed = model;
      success = true;
      console.log('[AI-ORCH] Resultado recibido OK.');
      return result;
    } catch (err) {
      console.warn(`[Strategist] ⚠️ ${provider.name} falló: ${err.message}`);
      lastError = err;
    }
  }

  throw lastError || new Error('Ningún proveedor pudo completar la tarea.');
};

// Alias retrocompatible
export const runStrategicAnalysis = generateStrategicAnalysis;

export default {
  generateStrategicAnalysis,
  runStrategicAnalysis,
};