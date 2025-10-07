// src/app/api/ai/live-coach/route.js
import { NextResponse } from 'next/server';
import aiOrchestrator from '@/lib/ai/aiOrchestrator';
import { createLiveCoachingPrompt } from '@/lib/ai/prompts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { liveData, userData, forceRefresh } = body;

    if (!liveData || !userData || !userData.zodiacSign) {
      return NextResponse.json({ message: 'Payload incompleto.' }, { status: 400, headers: CORS_HEADERS });
    }

    const prompt = createLiveCoachingPrompt(liveData, userData.zodiacSign);

    // Usar orchestrator (cacheTTL corto para live coaching)
    const res = await aiOrchestrator.getOrchestratedResponse({
      prompt,
      expectedType: 'object',
      kind: 'realtime',
      cacheTTL: 60 * 1000, // 1 minuto
      forceRefresh: !!forceRefresh,
    });

    return NextResponse.json(res, { status: 200, headers: CORS_HEADERS });

  } catch (err) {
    console.error('[API LIVE-COACH] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}
