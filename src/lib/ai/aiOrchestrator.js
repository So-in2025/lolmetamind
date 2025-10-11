// src/lib/ai/aiOrchestrator.js
// ============================================================
// AI Orchestrator (v1.1)
// - Precache, TTL cache, dedupe, model routing, batching/coalescing and metrics.
// - NORMALIZA SSML -> plain text automáticamente si el motor local NO soporta SSML.
// - PRO-DEV logs.
// ============================================================

import crypto from 'crypto';
import { generateStrategicAnalysis } from './strategist'; // tu orquestador multi-proveedor existente

// ---------------------------
// Config
// ---------------------------
const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 min
const COALESCE_WINDOW_MS = 60; // 60ms para coalescing dedupe
const MODEL_MAP = {
  realtime: 'gemini-2.0-flash',      // ultra rápido, bajo costo -> live/draft
  analysis: 'gpt-4o-mini',           // análisis profundo -> post-game / challenges
  default: 'gemini-2.0-flash'
};

// Si tu entorno local (Coqui / MMS-TTS) NO soporta SSML, dejar false.
// Puedes forzarlo con env var: SUPPORTS_SSML=true
const SUPPORTS_SSML = String(process.env.SUPPORTS_SSML || 'false').toLowerCase() === 'true';

// ---------------------------
// Cache (In-memory) con TTL
// ---------------------------
const memoryCache = new Map(); // key -> { value, expiresAt }

function now() { return Date.now(); }

function setMemoryCache(key, value, ttlMs = DEFAULT_TTL_MS) {
  const expiresAt = now() + ttlMs;
  memoryCache.set(key, { value, expiresAt });
  console.log(`[AI-ORCH] Cache SET key=${key} ttl=${ttlMs}ms`);
}

function getMemoryCache(key) {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < now()) {
    memoryCache.delete(key);
    console.log(`[AI-ORCH] Cache EXPIRED key=${key}`);
    return null;
  }
  // console.log(`[AI-ORCH] Cache HIT key=${key}`);
  return entry.value;
}

setInterval(() => {
  const t = now();
  for (const [k, v] of memoryCache.entries()) {
    if (v.expiresAt < t) {
      memoryCache.delete(k);
    }
  }
}, 60 * 1000).unref?.();

// ---------------------------
// Optional Redis support (soft)
// ---------------------------
let redisClient = null;
const REDIS_URL = process.env.REDIS_URL || null;
if (REDIS_URL) {
  try {
    // eslint-disable-next-line global-require
    const IORedis = require('ioredis');
    redisClient = new IORedis(REDIS_URL);
    redisClient.on('connect', () => console.log('[AI-ORCH] Redis conectado.'));
    redisClient.on('error', (err) => console.warn('[AI-ORCH] Redis error', err));
  } catch (err) {
    console.warn('[AI-ORCH] ioredis no disponible. Usando cache en memoria.', err.message);
    redisClient = null;
  }
}

// ---------------------------
// In-flight / coalesce map
// ---------------------------
const inFlight = new Map(); // promptHash -> Promise

function hashPrompt(prompt, options = {}) {
  const h = crypto.createHash('sha256');
  h.update(typeof prompt === 'string' ? prompt : JSON.stringify(prompt));
  if (options.model) h.update(`|model:${options.model}`);
  if (options.type) h.update(`|type:${options.type}`);
  return h.digest('hex');
}

// ---------------------------
// Metrics stub (PRO-DEV)
// ---------------------------
async function recordMetric(metric) {
  console.log('[AI-ORCH][METRIC]', JSON.stringify(metric));
  try {
    // eslint-disable-next-line global-require
    const { getSql } = require('@/lib/db');
    if (getSql) {
      const sql = getSql();
      const q = `INSERT INTO ai_requests (provider, model, duration_ms, success, fallback, prompt_hash, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW())`;
      sql.unsafe(q, [metric.provider || null, metric.model || null, metric.durationMs || 0, metric.success ? 1 : 0, metric.fallback ? 1 : 0, metric.promptHash || null]).catch(e => {
        console.warn('[AI-ORCH] No se pudo persistir métrica ai_requests', e.message);
      });
    }
  } catch (err) {
    // ignore if DB not present
  }
}

// ---------------------------
// SSML -> Plain helpers
// ---------------------------

function isLikelySSML(text) {
  if (!text || typeof text !== 'string') return false;
  return /<speak|<break|<emphasis|<prosody|<\/[a-z]/i.test(text);
}

function ssmlToPlain(ssml) {
  if (!ssml || typeof ssml !== 'string') return ssml || '';
  let t = String(ssml);
  t = t.replace(/<speak[^>]*>/gi, '').replace(/<\/speak>/gi, '');
  t = t.replace(/<break[^>]*time=["']?(\d+)ms["']?[^>]*\/?>/gi, (_, ms) => (parseInt(ms, 10) >= 400 ? '.  ' : ' … '));
  t = t.replace(/<\/?emphasis[^>]*>/gi, '');
  t = t.replace(/<[^>]+>/g, '');
  t = t.replace(/\s+/g, ' ').trim();
  if (t && !/[.!?…]$/.test(t)) t = `${t}.`;
  return t;
}

function composeFullTextFromParts(parts = {}) {
  const title = (parts.title || '').trim();
  const mantra = (parts.astralMantra || parts.mantra || '').trim();
  const focus = (parts.technicalFocus || parts.focus || '').trim();
  const pieces = [];
  if (title) pieces.push(title);
  if (mantra) pieces.push(mantra);
  if (focus) pieces.push(focus);
  const text = pieces.join('. ').replace(/\.\s*$/, '').trim();
  return text.endsWith('.') ? text : `${text}.`;
}

function normalizeContainer(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = Object.assign({}, obj);
  if (out.fullTextSSML && !SUPPORTS_SSML) {
    try {
      out.fullText = ssmlToPlain(out.fullTextSSML);
      console.log('[AI-ORCH] Converted fullTextSSML -> fullText (plain) because SUPPORTS_SSML=false');
    } catch (e) {
      console.warn('[AI-ORCH] Failed to convert SSML to plain:', e.message);
    }
  }
  if (out.fullText && isLikelySSML(out.fullText) && !SUPPORTS_SSML) {
    out.fullText = ssmlToPlain(out.fullText);
    console.log('[AI-ORCH] Stripped SSML from fullText -> plain text');
  }
  if ((!out.fullText || out.fullText.trim().length === 0) && (out.title || out.astralMantra || out.technicalFocus)) {
    const composed = composeFullTextFromParts(out);
    out.fullText = composed;
    console.log('[AI-ORCH] Composed fullText from parts');
  }
  if ((!out.fullText || out.fullText.trim().length === 0) && out.fullTextSSML && SUPPORTS_SSML) {
    out.fullText = out.fullTextSSML;
  }
  return out;
}

// ---------------------------
// Core: getOrchestratedResponse
// ---------------------------
export async function getOrchestratedResponse({
  prompt,
  expectedType = 'object',
  kind = 'realtime',
  cacheTTL = DEFAULT_TTL_MS,
  forceRefresh = false,
}) {
  if (!prompt) throw new Error('Prompt requerido para getOrchestratedResponse');

  const model = MODEL_MAP[kind] || MODEL_MAP.default;
  const promptHash = hashPrompt(prompt, { model, type: kind });
  const cacheKey = `ai:${kind}:${promptHash}`;

  if (!forceRefresh) {
    try {
      if (redisClient) {
        const raw = await redisClient.get(cacheKey);
        if (raw) return JSON.parse(raw);
      } else {
        const mem = getMemoryCache(cacheKey);
        if (mem) return mem;
      }
    } catch (err) {
      console.warn('[AI-ORCH] Error al leer cache (ignorado):', err.message);
    }
  }

  if (inFlight.has(promptHash)) {
    return inFlight.get(promptHash);
  }

  const p = (async () => {
    const startedAt = Date.now();
    let providerUsed = null;
    let result = null;
    let success = false;
    let fallback = false;
    let lastError; // ✅ CORRECCIÓN 1: 'lastError' está declarado.

    // *********************************************************
    // 💡 LÓGICA DE CLAVES Y LLAMADA A STRATEGIST CORREGIDA
    // *********************************************************
    try {
        // ✅ CORRECCIÓN 3: Se añaden los backticks (``) para una cadena válida.
        console.log(`[AI-ORCH] 🔍 Delegando al strategist con el modelo preferido: ${model}...`);
        
        // Preparamos los arrays de claves para enviarlos al strategist.
        const geminiKeys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2].filter(Boolean);
        const openAIKeys = [process.env.OPENAI_API_KEY, process.env.OPENAI_API_KEY_2].filter(Boolean);

        // Llamamos al strategist una sola vez, pasándole todos los recursos que necesita.
        const strategicResult = await generateStrategicAnalysis(
            prompt, 
            expectedType, 
            model, 
            geminiKeys, 
            openAIKeys
        );
        
        // Procesamos el resultado que devuelve el strategist.
        result = strategicResult.data;
        providerUsed = strategicResult.providerUsed;
        fallback = strategicResult.fallbackUsed;
        success = true; // Si estamos aquí, es porque el strategist tuvo éxito.
        
        console.log(`[AI-ORCH] Resultado recibido OK del strategist. Proveedor usado: ${providerUsed}.`);

    } catch (err) {
        console.warn(`[AI-ORCH] ⚠️ Strategist falló después de todos los intentos: ${err.message}`);
        lastError = err; // Guardamos el error final que nos devuelve el strategist.
    }

    // Si no hubo éxito, lanzamos el error para que sea capturado y registrado.
    if (!success && lastError) {
        recordMetric({ provider: providerUsed, model, durationMs: Date.now() - startedAt, success: false, fallback: true, promptHash });
        throw lastError;
    }
    // *********************************************************

    // NORMALIZAR: asegurar fullText plano si es necesario
    try {
      if (result && typeof result === 'object') {
        const containers = ['preGameAnalysis', 'realtimeAdvice', 'draftAnalysis', 'performance', 'data', 'analysis'];
        let applied = false;
        for (const c of containers) {
          if (result[c] && typeof result[c] === 'object') {
            result[c] = normalizeContainer(result[c]);
            applied = true;
          }
        }
        if (!applied) {
          result = normalizeContainer(result);
        }
      }
    } catch (e) {
      console.warn('[AI-ORCH] Warning normalizing result:', e.message);
    }

    // Añadido: Registrar métrica de éxito si no se ha lanzado un error antes
    if(success) {
      recordMetric({ provider: providerUsed, model, durationMs: Date.now() - startedAt, success, fallback, promptHash });
    }

    // 4) Guardar en cache
    try {
      const payload = result;
      if (redisClient) {
        await redisClient.set(cacheKey, JSON.stringify(payload), 'PX', cacheTTL);
      } else {
        setMemoryCache(cacheKey, payload, cacheTTL);
      }
    } catch (err) {
      console.warn('[AI-ORCH] No se pudo guardar en cache:', err.message);
    }

    return result;
  })();

  inFlight.set(promptHash, p);
  p.finally(() => {
    setTimeout(() => inFlight.delete(promptHash), COALESCE_WINDOW_MS * 2);
  });

  return p;
}

// ---------------------------
// Helper: precache (serie de prompts)
// ---------------------------
export async function precachePrompts(entries = [], options = {}) {
  console.log(`[AI-ORCH] Precache iniciado: ${entries.length} items`);
  const results = [];
  for (const e of entries) {
    try {
      const r = await getOrchestratedResponse({
        prompt: e.prompt,
        expectedType: e.expectedType || 'object',
        kind: e.kind || 'realtime',
        cacheTTL: e.cacheTTL || DEFAULT_TTL_MS,
        forceRefresh: !!e.forceRefresh
      });
      results.push(r);
    } catch (err) {
      console.warn('[AI-ORCH] Precache error para entry:', err.message);
    }
  }
  console.log('[AI-ORCH] Precache finalizado.');
  return results;
}

// ---------------------------
// Exports
// ---------------------------
export default {
  getOrchestratedResponse,
  precachePrompts,
};