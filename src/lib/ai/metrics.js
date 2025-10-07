// src/lib/ai/metrics.js
// PRO-DEV helper para formateo y persistencia de métricas AI.
// Puedes invocarlo desde aiOrchestrator.recordMetric si quieres separar responsabilidades.

export async function persistAiMetric(sql, metric) {
  try {
    const q = `INSERT INTO ai_requests (provider, model, duration_ms, success, fallback, prompt_hash, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW())`;
    await sql.unsafe(q, [metric.provider || null, metric.model || null, metric.durationMs || 0, metric.success ? 1 : 0, metric.fallback ? 1 : 0, metric.promptHash || null]);
  } catch (err) {
    console.warn('[METRICS] No se pudo persistir métrica', err.message);
  }
}
