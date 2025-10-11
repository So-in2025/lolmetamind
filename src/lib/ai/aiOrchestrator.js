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

/**
 * Detecta si un texto tiene etiquetas SSML
 */
function isLikelySSML(text) {
  if (!text || typeof text !== 'string') return false;
  return /<speak|<break|<emphasis|<prosody|<\/[a-z]/i.test(text);
}

/**
 * Convierte SSML simple a texto plano legible:
 * - <break time="Xms"/> -> ' … ' (o '. ' si largo)
 * - elimina tags de énfasis conservando el texto
 * - elimina cualquier tag restante
 */
function ssmlToPlain(ssml) {
  if (!ssml || typeof ssml !== 'string') return ssml || '';

  let t = String(ssml);

  // Normalizar wrapper speak
  t = t.replace(/<speak[^>]*>/gi, '').replace(/<\/speak>/gi, '');

  // Reemplazar break tags por pausas: breaks >= 400ms -> '.  ' (respiración), else ' … '
  t = t.replace(/<break[^>]*time=["']?(\d+)ms["']?[^>]*\/?>/gi, (_, ms) => {
    const n = parseInt(ms, 10) || 300;
    return n >= 400 ? '.  ' : ' … ';
  });

  // Reemplazar semánticamente etiquetas de énfasis por comas o mayúsculas (mantener contenido)
  t = t.replace(/<\/?emphasis[^>]*>/gi, '');

  // Quitar otras etiquetas conservando texto
  t = t.replace(/<[^>]+>/g, '');

  // Limpiar espacios
  t = t.replace(/\s+/g, ' ').trim();

  // Asegurar puntuación final
  if (t && !/[.!?…]$/.test(t)) t = `${t}.`;

  return t;
}

/**
 * Compose full text from fragments if necessary
 */
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

/**
 * Normalize container: ensure it has plain fullText (never raw SSML unless SUPPORTS_SSML)
 */
function normalizeContainer(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const out = Object.assign({}, obj);

  // If there's SSML and the runtime DOESN'T support SSML, convert
  if (out.fullTextSSML && !SUPPORTS_SSML) {
    try {
      out.fullText = ssmlToPlain(out.fullTextSSML);
      // keep fullTextSSML for consumers who might want it, but fullText is authoritative
      console.log('[AI-ORCH] Converted fullTextSSML -> fullText (plain) because SUPPORTS_SSML=false');
    } catch (e) {
      console.warn('[AI-ORCH] Failed to convert SSML to plain:', e.message);
    }
  }

  // If fullText exists but contains SSML tags (eg backend returned SSML in fullText), strip
  if (out.fullText && isLikelySSML(out.fullText) && !SUPPORTS_SSML) {
    out.fullText = ssmlToPlain(out.fullText);
    console.log('[AI-ORCH] Stripped SSML from fullText -> plain text');
  }

  // If there's no fullText but there are parts, compose them
  if ((!out.fullText || out.fullText.trim().length === 0) && (out.title || out.astralMantra || out.technicalFocus)) {
    const composed = composeFullTextFromParts(out);
    out.fullText = composed;
    console.log('[AI-ORCH] Composed fullText from parts');
  }

  // Ensure plain fallback: if still missing fullText but fullTextSSML exists and SUPPORTS_SSML true, leave it
  if ((!out.fullText || out.fullText.trim().length === 0) && out.fullTextSSML && SUPPORTS_SSML) {
    // If consumer supports SSML, we keep SSML only
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
} = {}) {
  if (!prompt) throw new Error('Prompt requerido para getOrchestratedResponse');

  const model = MODEL_MAP[kind] || MODEL_MAP.default;
  const promptHash = hashPrompt(prompt, { model, type: kind });
  const cacheKey = `ai:${kind}:${promptHash}`;

  // 1) CACHE check
  if (!forceRefresh) {
    try {
      if (redisClient) {
        const raw = await redisClient.get(cacheKey);
        if (raw) {
          console.log(`[AI-ORCH] Redis cache HIT ${cacheKey}`);
          return JSON.parse(raw);
        }
      } else {
        const mem = getMemoryCache(cacheKey);
        if (mem) return mem;
      }
    } catch (err) {
      console.warn('[AI-ORCH] Error al leer cache (ignorado):', err.message);
    }
  }

  // 2) COALESCE
  if (inFlight.has(promptHash)) {
    console.log(`[AI-ORCH] Coalescing request para promptHash=${promptHash}`);
    return inFlight.get(promptHash);
  }

  const p = (async () => {
    const startedAt = Date.now();
    let providerUsed = null;
    let result = null;
    let success = false;
    let fallback = false;

    // *********************************************************
    // 💡 AQUÍ ES DONDE SE ITERA POR LAS CLAVES DE API
    // *********************************************************
    const keys = (model.startsWith('gemini') ? [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2] : (model.startsWith('gpt') ? [process.env.OPENAI_API_KEY, process.env.OPENAI_API_KEY_2] : [null])) || [null]; // Usa las claves del provider
    for (const key of keys) {
       try {
            console.log(`[AI-ORCH] 🔍 Intentando con ${model} con key...`);
            result = await generateStrategicAnalysis(prompt, expectedType, model, key || null);
            providerUsed = model;
            success = true;
            console.log('[AI-ORCH] Resultado recibido OK.');
            break;
        } catch (err) {
          console.warn(`[AI-ORCH] ⚠️  ${model} falló: ${err.message}`);
          lastError = err;
        }
    }
    // *********************************************************

    // NORMALIZAR: asegurar fullText plano si es necesario
    try {
      if (result && typeof result === 'object') {
        // buscar contenedor común
        const containers = ['preGameAnalysis', 'realtimeAdvice', 'draftAnalysis', 'performance', 'data', 'analysis'];
        let applied = false;
        for (const c of containers) {
          if (result[c] && typeof result[c] === 'object') {
            result[c] = normalizeContainer(result[c]);
            applied = true;
          }
        }
        if (!applied) {
          // si la respuesta parece ser el objeto objetivo en root, normalizar root
          result = normalizeContainer(result);
        }
      }
    } catch (e) {
      console.warn('[AI-ORCH] Warning normalizing result:', e.message);
    }

    // 4) Guardar en cache
    try {
      const payload = result;
      if (redisClient) {
        await redisClient.set(cacheKey, JSON.stringify(payload), 'PX', cacheTTL);
        console.log(`[AI-ORCH] Guardado en Redis cache ${cacheKey} ttl=${cacheTTL}ms`);
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