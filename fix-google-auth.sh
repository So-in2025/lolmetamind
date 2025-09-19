#!/bin/bash

# ==============================================================================
# SCRIPT DE CORRECCIÓN - ERROR DE IMPORTACIÓN DE LA API RIOT
# ==============================================================================

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Aplicando corrección para el flujo de la API de Riot...${NC}"

# --- 1. Reescribiendo 'src/app/api/analysis/post-match/route.js' para usar las nuevas funciones ---
echo -e "\n${GREEN}Paso 1: Reescribiendo 'src/app/api/analysis/post-match/route.js'...${NC}"
cat << 'EOF' > src/app/api/analysis/post-match/route.js
import { NextResponse } from 'next/server';
import { getAccountByRiotId, getSummonerByPuuid } from '../../../../services/riotApiService';
import { generateStrategicAnalysis } from '../../../../lib/ai/strategist';

export async function POST(request) {
  const { gameName, tagLine, region } = await request.json();

  if (!gameName || !tagLine || !region) {
    return NextResponse.json({ error: 'Nombre de juego, tagline y región son requeridos' }, { status: 400 });
  }

  try {
    const accountData = await getAccountByRiotId(gameName, tagLine, region);
    const { puuid } = accountData;
    const summonerData = await getSummonerByPuuid(puuid, region);
    const { id: summonerId } = summonerData;
    
    // Lógica para obtener el historial de partidas y generar el análisis con la IA
    // Esta es una simulación ya que la API de historial de partidas no está implementada
    const mockMatchHistory = {};
    const analysis = await generateStrategicAnalysis({ summonerData, matchHistory: mockMatchHistory });

    if (analysis.error) {
      return NextResponse.json({ error: analysis.message }, { status: 503 });
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error al procesar el análisis post-partida:', error.response?.data || error.message);
    return NextResponse.json({ error: 'Error interno del servidor al procesar la solicitud.' }, { status: 500 });
  }
}
EOF
echo -e "${GREEN}Archivo 'src/app/api/analysis/post-match/route.js' actualizado correctamente. ✅${NC}"

echo -e "\n${CYAN}----------------------------------------------------------------------"
echo -e "¡Script finalizado! ✅"
echo -e "----------------------------------------------------------------------${NC}"