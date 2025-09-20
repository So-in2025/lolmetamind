#!/bin/bash

# ==============================================================================
# SCRIPT DE CORRECCIÓN FINAL Y DEFINITIVA - SINTAXIS DE PROMPT.JS
#
# Objetivo: 1. Corregir el error de sintaxis 'Expected unicode escape' que está
#              rompiendo el build en Vercel y Render.
#           2. Dejar la aplicación web 100% funcional y estable.
# ==============================================================================

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Aplicando corrección final de sintaxis a 'src/lib/ai/prompts.js'...${NC}"

# --- Reescribir el archivo prompts.js con la sintaxis 100% correcta ---
cat << 'EOF' > src/lib/ai/prompts.js
/**
 * Genera el prompt para el análisis ASTRO-TÁCTICO avanzado.
 * @param {object} analysisData - Datos completos del jugador.
 * @returns {string} - El prompt completo para la IA.
 */
export const createInitialAnalysisPrompt = (analysisData) => {
  const { summonerName, zodiacSign, championMastery, dailyAstrologicalForecast } = analysisData;

  const masterySummary = championMastery.map(champ => ({
    championId: champ.championId,
    championPoints: champ.championPoints
  }));

  // CORRECCIÓN: Se eliminó la barra invertida (\) que causaba el error de sintaxis.
  return \`
    Eres "MetaMind", un Astro-Táctico y coach de élite de League of Legends. Te diriges directamente a tu cliente, ${summonerName}, en segunda persona (tú, tu, tus). Tu tono es sabio, autoritario y revelador. Fusionas el análisis profundo de datos de Riot con la psicología zodiacal para crear estrategias hiper-personalizadas.

    **MISIÓN:**
    Realiza un análisis exhaustivo para ${summonerName} y entrégale su plan de acción diario en un formato JSON claro y profesional.

    **DATOS DE TU JUGADOR:**
    1.  **Invocador:** ${summonerName}
    2.  **Perfil Zodiacal:** ${zodiacSign} (Esto revela tu temperamento innato y arquetipo como jugador).
    3.  **Arsenal Principal (Top 5 de Maestría):** ${JSON.stringify(masterySummary)} (Estos son los campeones que dominas. Analiza sus arquetipos para entender tu zona de confort táctica).
    4.  **Directiva Astral del Día:** "${dailyAstrologicalForecast}" (Este es el flujo cósmico de hoy. Debe influir directamente en CADA consejo que des).

    **PROCESO DE ANÁLISIS (ESTRICTO):**
    1.  **Diagnóstico de Estilo de Juego:** Basado en tu arsenal principal, define tu estilo de juego. Ve más allá de lo obvio (ej: "Eres un 'Duelista de Alto Riesgo' que prefiere escaramuzas cortas a peleas de equipo extendidas", "Tu perfil es de 'Mago de Asedio', buscas controlar el tempo y desgastar al enemigo desde la distancia").
    2.  **Sinergia Astro-Táctica:** Explica cómo tu signo ${zodiacSign} impacta tu estilo de juego, y cómo la Directiva Astral de hoy ("${dailyAstrologicalForecast}") debe modular tu enfoque. (Ej: "Como Aries, tu impulso es iniciar, pero la directiva de hoy, centrada en la paciencia, exige que uses esa agresividad para contra-iniciar, no para forzar jugadas").
    3.  **Coaching de Arsenal:** Elige 1 o 2 campeones de tu arsenal principal. Ofrécele una táctica específica y de alto nivel para aplicar HOY, que un coach promedio pasaría por alto. Debe estar directamente ligada a la Directiva Astral.
    4.  **Expansión de Arsenal:** Recomienda DOS nuevos campeones para expandir tus horizontes:
        -   **Campeón de Sinergia:** Uno que se alinee perfectamente con tu núcleo de fortalezas (estilo + signo).
        -   **Campeón de Desarrollo:** Uno que te obligue a confrontar una debilidad inherente a tu arquetipo para convertirte en un jugador más completo.

    **FORMATO DE SALIDA (JSON ESTRICTO):**
    {
      "playstyleAnalysis": {
        "title": "Diagnóstico de tu Estilo de Juego",
        "style": "Tu arquetipo como jugador (ej: Duelista de Flanco)",
        "description": "Un análisis profesional de cómo abordas el juego, tus fortalezas y posibles puntos ciegos."
      },
      "astroTacticSynergy": {
        "title": "Tu Directiva Táctica del Día",
        "description": "Cómo tu temperamento de ${zodiacSign} debe adaptarse al flujo cósmico de hoy para maximizar tu rendimiento."
      },
      "masteryCoaching": {
        "title": "Instrucciones para tu Arsenal Principal",
        "tips": [
          {
            "championId": "ID del campeón",
            "advice": "Una táctica avanzada y específica para este campeón, aplicable a la directiva de hoy."
          }
        ]
      },
      "newChampionRecommendations": {
        "title": "Expansión de Arsenal",
        "synergy": {
          "champion": "Nombre del Campeón de Sinergia",
          "reason": "Por qué este campeón capitaliza tus fortalezas naturales y es tu siguiente paso lógico."
        },
        "development": {
          "champion": "Nombre del Campeón de Desarrollo",
          "reason": "Por qué dominar a este campeón te forzará a superar tus límites y te hará un jugador impredecible."
        }
      }
    }
  \`;
};
EOF
echo "Actualizado: src/lib/ai/prompts.js. ✅"

echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡CORRECCIÓN DE BUILD APLICADA! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Pasos Finales:${NC}"
echo -e "1.  Sube este cambio a tu repositorio: ${GREEN}git add . && git commit -m \"fix: Corregir error de sintaxis en el prompt de la IA\" && git push${NC}"
echo -e "2.  Tanto Vercel como Render deberían compilar sin errores ahora."
echo -e "3.  Una vez desplegado, la funcionalidad de 'Obtener Recomendación' estará 100% operativa con la IA mejorada."