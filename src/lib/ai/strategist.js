// src/lib/ai/strategist.js
// ============================================================
// 🧠 Strategist v5.5 (COMPATIBLE CON ORQUESTADOR)
// - Acepta arrays de claves y maneja el fallback entre proveedores.
// - Itera sobre las claves para cada proveedor.
// - Devuelve un objeto detallado al orquestador.
// ============================================================

// Se eliminan las importaciones directas de claves, ya que se reciben como parámetros.

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
    if (text.startsWith('```json')) text = text.slice(7, -3).trim();
    else if (text.startsWith('```')) text = text.slice(3, -3).trim();

    const startIndex = text.indexOf(expectedType === 'array' ? '[' : '{');
    const endIndex = text.lastIndexOf(expectedType === 'array' ? ']' : '}');

    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
      throw new Error(`No se encontró una estructura JSON válida que comience con '${expectedType === 'array' ? '[' : '{'}' y termine con '${expectedType === 'array' ? ']' : '}'}'.`);
    }

    const clean = text.substring(startIndex, endIndex + 1).trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('[Strategist] ❌ Error parseando JSON:', err.message);
    console.error('Texto original recibido de la IA:', rawText);
    throw new Error('Error al parsear la respuesta JSON de la IA.');
  }
}

// ---------------------------
// ⚙️ Gemini Provider
// ---------------------------
const geminiProvider = {
  name: 'Gemini',
  call: async (prompt, expectedType, modelName, key) => {
    const t0 = performance.now();
    const API_URL = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${key}`;
    const bodyPayload = { contents: [{ parts: [{ text: prompt }] }], safetySettings: SAFETY_SETTINGS };
    const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyPayload) });
    const elapsed = (performance.now() - t0).toFixed(0);
    const data = await response.json();
    if (!response.ok) throw new Error(`Gemini error ${response.status}: ${JSON.stringify(data.error || data)}`);
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Gemini devolvió una respuesta vacía');
    console.log(`[Strategist] ✅ Gemini OK (${modelName}) en ${elapsed}ms`);
    return parseJSONResponse(rawText, expectedType);
  },
};

// ---------------------------
// ⚙️ OpenAI Provider
// ---------------------------
const openAIProvider = {
  name: 'OpenAI',
  call: async (prompt, expectedType, modelName, key) => {
    const t0 = performance.now();
    const API_URL = 'https://api.openai.com/v1/chat/completions';
    const bodyPayload = { model: modelName, temperature: DEFAULT_TEMPERATURE, messages: [{ role: 'user', content: prompt }] };
    const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }, body: JSON.stringify(bodyPayload) });
    const elapsed = (performance.now() - t0).toFixed(0);
    const data = await response.json();
    if (!response.ok) throw new Error(`OpenAI error ${response.status}: ${JSON.stringify(data.error || data)}`);
    const rawText = data.choices?.[0]?.message?.content;
    if (!rawText) throw new Error('OpenAI devolvió una respuesta vacía');
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
  geminiKeys = [],
  openAIKeys = []
) => {
  if (!prompt) throw new Error('Prompt vacío o inválido.');

  const isGeminiPrimary = modelName.startsWith('gemini');
  const primaryProvider = isGeminiPrimary ? geminiProvider : openAIProvider;
  const fallbackProvider = isGeminiPrimary ? openAIProvider : geminiProvider;
  const primaryKeys = isGeminiPrimary ? geminiKeys : openAIKeys;
  const fallbackKeys = isGeminiPrimary ? openAIKeys : geminiKeys;
  
  let lastError;

  // Intento 1: Proveedor principal con todas sus claves.
  for (const key of primaryKeys) {
    try {
      console.log(`[Strategist] 🔍 Intentando con proveedor principal ${primaryProvider.name} (${modelName})...`);
      const result = await primaryProvider.call(prompt, expectedType, modelName, key);
      // Si tiene éxito, devuelve un objeto detallado.
      return { data: result, providerUsed: primaryProvider.name, fallbackUsed: false };
    } catch (err) {
      console.warn(`[Strategist] ⚠️ ${primaryProvider.name} falló con una clave: ${err.message}`);
      lastError = err; // Guarda el error para un posible throw final.
    }
  }

  // Intento 2: Proveedor de fallback con todas sus claves.
  console.log(`[Strategist] 🔄 Fallback a proveedor ${fallbackProvider.name}...`);
  for (const key of fallbackKeys) {
    try {
      // Usamos un modelo por defecto para el proveedor de fallback.
      const fallbackModel = fallbackProvider.name === 'Gemini' ? 'gemini-2.0-flash' : 'gpt-4o-mini';
      console.log(`[Strategist] 🔍 Intentando con proveedor de fallback ${fallbackProvider.name} (${fallbackModel})...`);
      const result = await fallbackProvider.call(prompt, expectedType, fallbackModel, key);
      return { data: result, providerUsed: fallbackProvider.name, fallbackUsed: true };
    } catch (err) {
      console.warn(`[Strategist] ⚠️ ${fallbackProvider.name} falló con una clave: ${err.message}`);
      lastError = err;
    }
  }

  // Si todos los intentos fallan, lanza el último error capturado.
  throw lastError || new Error('Ambos proveedores (principal y de respaldo) fallaron después de intentar con todas las claves disponibles.');
};

// Alias retrocompatible (opcional, pero buena práctica si se usaba antes)
export const runStrategicAnalysis = generateStrategicAnalysis;

export default {
  generateStrategicAnalysis,
  runStrategicAnalysis,
};