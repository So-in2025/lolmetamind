// src/lib/ai/aiOrchestrator.js
// ============================================================
// AI Orchestrator (v1.0) - Precache, TTL cache, dedupe, model routing,
// simple batching/coalescing and metrics hooks.
// PRO-DEV: diseñado para integrarse con generateStrategicAnalysis()
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

// ---------------------------
// Cache (In-memory) con TTL
// ---------------------------
const memoryCache = new Map(); // key -> { value, expiresAt }

function now() { return Date.now(); }

function setMemoryCache(key, value, ttlMs = DEFAULT_TTL_MS) {
  const expiresAt = now() + ttlMs;
  memoryCache.set(key, { value, expiresAt });
  // PRO-DEV log
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
  console.log(`[AI-ORCH] Cache HIT key=${key}`);
  return entry.value;
}

// Periodic cleanup (keeps memory low)
setInterval(() => {
  const t = now();
  for (const [k, v] of memoryCache.entries()) {
    if (v.expiresAt < t) {
      memoryCache.delete(k);
      // silent GC log
    }
  }
}, 60 * 1000).unref();

// ---------------------------
// Optional Redis support (soft)
// ---------------------------
let redisClient = null;
const REDIS_URL = process.env.REDIS_URL || null;
if (REDIS_URL) {
  try {
    // lazy require so module doesn't crash if lib missing
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
// Metrics stub (PRO-DEV) -> imprime y opcionalmente persiste si getSql() existe
// ---------------------------
async function recordMetric(metric) {
  // metric: { provider, model, durationMs, success, fallback, promptHash }
  console.log('[AI-ORCH][METRIC]', JSON.stringify(metric));
  // Si quieres persistir: detectar getSql y guardar en tabla ai_requests
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
    // no hacer nada si getSql no existe en entorno
  }
}

// ---------------------------
// Core: request handling (cache -> coalesce -> call provider)
// ---------------------------
export async function getOrchestratedResponse({
  prompt,
  expectedType = 'object',
  kind = 'realtime',       // 'realtime' | 'analysis' | 'default'
  cacheTTL = DEFAULT_TTL_MS,
  forceRefresh = false,
} = {}) {
  if (!prompt) throw new Error('Prompt requerido para getOrchestratedResponse');

  // seleccionar modelo
  const model = MODEL_MAP[kind] || MODEL_MAP.default;
  const promptHash = hashPrompt(prompt, { model, type: kind });
  const cacheKey = `ai:${kind}:${promptHash}`;

  // 1) CACHE check (Redis preferred)
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

  // 2) COALESCE: Si ya hay request en flight para el mismo promptHash, reusar promesa
  if (inFlight.has(promptHash)) {
    console.log(`[AI-ORCH] Coalescing request para promptHash=${promptHash}`);
    return inFlight.get(promptHash);
  }

  // 3) Crear promesa y almacenarla para coalescing
  const p = (async () => {
    const startedAt = Date.now();
    let providerUsed = null;
    let result = null;
    let success = false;
    let fallback = false;

    try {
      // Llamada a tu orquestador existente (usa fallback interno entre proveedores)
      console.log(`[AI-ORCH] Llamando generateStrategicAnalysis (model=${model}, kind=${kind})`);
      result = await generateStrategicAnalysis(prompt, expectedType, model);
      providerUsed = model;
      success = true;
      console.log('[AI-ORCH] Resultado recibido OK.');
    } catch (err) {
      // En caso de fallo, reintentar una vez con default model distinto
      console.warn('[AI-ORCH] Error al generar (primer intento):', err.message);
      fallback = true;
      try {
        const fallbackModel = model === MODEL_MAP.realtime ? MODEL_MAP.analysis : MODEL_MAP.realtime;
        console.log(`[AI-ORCH] Intentando fallback model=${fallbackModel}`);
        result = await generateStrategicAnalysis(prompt, expectedType, fallbackModel);
        providerUsed = fallbackModel;
        success = true;
      } catch (err2) {
        console.error('[AI-ORCH] Fallback falló:', err2.message);
        throw err2;
      }
    } finally {
      const durationMs = Date.now() - startedAt;
      // Persistir métricas (async fire-and-forget)
      recordMetric({ provider: providerUsed, model, durationMs, success, fallback, promptHash }).catch(() => {});
    }

    // 4) Guardar en cache (Redis o memoria)
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

  // Guardar en inFlight y quitar después de COALESCE_WINDOW_MS + margin
  inFlight.set(promptHash, p);
  // remove inFlight after finished
  p.finally(() => {
    // limpiar inFlight con pequeño delay para coalescing
    setTimeout(() => inFlight.delete(promptHash), COALESCE_WINDOW_MS * 2);
  });

  return p;
}

// ---------------------------
// Helper: precache (serie de prompts)
// ---------------------------
export async function precachePrompts(entries = [], options = {}) {
  // entries: [{ prompt, expectedType, kind, cacheTTL }]
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
