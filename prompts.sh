#!/bin/bash

# ==============================================================================
# SCRIPT DE ACTUALIZACIÓN - FASE 3 (Parte 1): INTEGRACIÓN DE IA REAL
#
# Rol: Arquitecto de IA / Backend Developer
# Objetivo: Reemplazar la simulación de análisis estratégico con una llamada
#           real a la API de Gemini Pro. Esto marca el primer paso crítico
#           en la Fase 3, dando vida al coach con inteligencia real.
# ==============================================================================

# --- Colores para la salida ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Iniciando la Fase 3: Integración de la IA (Gemini Pro)...${NC}"

# --- 1. Creación de un Módulo de Prompts para la IA ---
echo -e "\n${GREEN}Paso 1: Creando el módulo de prompts en 'src/lib/ai/prompts.js'...${NC}"
cat << 'EOF' > src/lib/ai/prompts.js
// src/lib/ai/prompts.js

/**
 * Genera el prompt para el análisis estratégico inicial.
 * @param {object} playerData - Datos del jugador (summonerName, region, zodiacSign).
 * @param {object} teamData - Datos simulados o reales del equipo aliado y enemigo.
 * @returns {string} - El prompt completo para la IA.
 */
export const createInitialAnalysisPrompt = (playerData, teamData) => {
  const { summonerName, zodiacSign } = playerData;

  // En una versión futura, teamData vendría de la API de Riot.
  const { allies, enemies } = teamData;

  return `
    Eres "MetaMind", un coach experto de League of Legends con un conocimiento único de la "psicología zodiacal" aplicada al juego.
    Tu tono es analítico, proactivo y ligeramente místico.

    Analiza los siguientes datos de partida para el invocador "${summonerName}" (signo ${zodiacSign}) y proporciona un plan de acción conciso en formato JSON.

    Equipo Aliado: ${JSON.stringify(allies)}
    Equipo Enemigo: ${JSON.stringify(enemies)}

    Basado en la composición de equipos, el meta actual y el perfil zodiacal del jugador, genera la siguiente estructura JSON:

    {
      "champion": "Nombre del Campeón Recomendado",
      "role": "Rol Asignado",
      "archetype": "Arquetipo de Juego (ej: Mago de Control, Asesino, Tanque de Vanguardia)",
      "teamAnalysis": {
        "strength": "La principal fortaleza de la composición aliada (ej: 'Excelente capacidad de iniciación y peleas en equipo').",
        "weakness": "La principal debilidad de la composición aliada (ej: 'Vulnerables al pokeo y asedios largos')."
      },
      "enemyWeaknesses": [
        "Una debilidad clave del equipo enemigo (ej: 'Poca resistencia contra engages directos').",
        "Otra debilidad clave (ej: 'Su ADC es inmóvil y depende de su soporte para sobrevivir')."
      ],
      "strategicAdvice": [
        {
          "type": "early",
          "content": "Un consejo específico para el juego temprano (minutos 1-15) basado en el análisis zodiacal. Ejemplo: 'Como ${zodiacSign}, tu instinto te llevará a buscar jugadas agresivas. Úsalo para invadir la jungla enemiga con tu jungla en el minuto 3'."
        },
        {
          "type": "mid",
          "content": "Un consejo clave para el juego medio (minutos 15-25) enfocado en objetivos. Ejemplo: 'Controla la visión alrededor del Dragón. Vuestra composición es superior en peleas 5v5'."
        },
        {
          "type": "late",
          "content": "Una condición de victoria para el juego tardío (minutos 25+). Ejemplo: 'Tu rol es proteger a tu ADC. Si él sobrevive, ganáis la partida'."
        }
      ]
    }
  `;
};
EOF
echo "Creado: src/lib/ai/prompts.js"


# --- 2. Actualización del Módulo Estratega para llamar a la API de Gemini ---
echo -e "\n${GREEN}Paso 2: Modificando 'src/lib/ai/strategist.js' para la llamada a la API real...${NC}"
cat << 'EOF' > src/lib/ai/strategist.js
// src/lib/ai/strategist.js
import { GEMINI_API_KEY } from '../../services/apiConfig';
import { createInitialAnalysisPrompt } from './prompts';

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Genera un análisis estratégico basado en los datos de la partida llamando a la API de Gemini.
 * @param {object} playerData - Datos del jugador (summonerName, region, zodiacSign).
 * @returns {Promise<object>} - El análisis JSON generado por la IA.
 */
export const generateStrategicAnalysis = async (playerData) => {
  console.log("Iniciando análisis de IA con datos reales:", playerData);

  // TODO: En el futuro, estos datos vendrán de la API de Riot. Por ahora, los simulamos.
  const simulatedTeamData = {
    allies: [{ champion: "Malphite", role: "TOP" }, { champion: "Amumu", role: "JUNGLE" }],
    enemies: [{ champion: "Ezreal", role: "ADC" }, { champion: "Lux", role: "SUPPORT" }],
  };

  const prompt = createInitialAnalysisPrompt(playerData, simulatedTeamData);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Error en la respuesta de la API de Gemini:', response.status, errorBody);
      throw new Error(`Error de la API de Gemini: ${response.status}`);
    }

    const data = await response.json();
    
    // Extraer y limpiar el contenido JSON de la respuesta
    const rawText = data.candidates[0].content.parts[0].text;
    const jsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    console.log("Análisis JSON recibido de la IA:", jsonText);
    return JSON.parse(jsonText);

  } catch (error) {
    console.error('Error al generar análisis estratégico:', error);
    // Devolvemos un objeto de error estructurado para que el frontend pueda manejarlo.
    return {
      error: true,
      message: "El coach de IA no está disponible en este momento. Inténtalo de nuevo más tarde."
    };
  }
};
EOF
echo "Actualizado: src/lib/ai/strategist.js"


# --- 3. Ajuste del Endpoint para Manejar la Nueva Respuesta ---
echo -e "\n${GREEN}Paso 3: Ajustando 'src/app/api/recommendation/route.js' para la nueva respuesta...${NC}"
cat << 'EOF' > src/app/api/recommendation/route.js
import { NextResponse } from 'next/server';
import { generateStrategicAnalysis } from '../../../lib/ai/strategist';

export async function POST(request) {
  try {
    const playerData = await request.json();
    console.log('API de recomendación recibiendo datos:', playerData);
    
    // La función ahora devuelve directamente el objeto JSON del análisis
    const analysisResult = await generateStrategicAnalysis(playerData);

    // Si la IA devolvió un error, lo propagamos al cliente con un estado 503
    if (analysisResult.error) {
      return NextResponse.json({ error: analysisResult.message }, { status: 503 });
    }

    // Si todo fue bien, devolvemos el análisis completo
    return NextResponse.json(analysisResult);

  } catch (error) {
    console.error('Error en el endpoint /api/recommendation:', error);
    return NextResponse.json({ error: 'Hubo un error interno al procesar la solicitud' }, { status: 500 });
  }
}
EOF
echo "Actualizado: src/app/api/recommendation/route.js"

echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡La integración con la IA de Gemini ha sido completada! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Pasos a seguir:${NC}"
echo -e "1.  Asegúrate de tener tu clave de API de Gemini en la variable de entorno ${GREEN}GEMINI_API_KEY${NC} en tu archivo ${GREEN}.env.local${NC}."
echo -e "2.  Ejecuta la aplicación. El formulario ahora llamará a la IA real para obtener el análisis."
echo -e "3.  Sube estos cambios a tu repositorio para guardar el progreso."
echo -e "\n¡Estamos un paso más cerca de la producción, ingeniero! Listo para la siguiente fase cuando tú lo estés."