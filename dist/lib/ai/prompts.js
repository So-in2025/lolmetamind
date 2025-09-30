"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createPerformanceAnalysisPrompt = exports.createMetaAnalysisPrompt = exports.createLiveCoachingPrompt = exports.createInitialAnalysisPrompt = exports.createChampSelectPrompt = exports.createChallengeGenerationPrompt = void 0;
// src/lib/ai/prompts.js

// --- PROMPT PARA COACHING EN SELECCIÓN DE CAMPEÓN ---
const createChampSelectPrompt = (draftData, summonerData) => {
  const {
    myTeamPicks,
    theirTeamPicks,
    bans
  } = draftData;
  const {
    summonerName,
    zodiacSign
  } = summonerData;
  return `
      Eres "MetaMind", un coach de élite de League of Legends. Tu cliente es ${summonerName}.

      **PERFIL PSICOLÓGICO DEL JUGADOR:**
      - **Arquetipo Zodiacal:** ${zodiacSign}. Esto indica una tendencia a [ej: Aries: agresivo, impulsivo, le gusta iniciar; Tauro: paciente, defensivo, metódico; Géminis: adaptable, versátil, le gusta rotar]. Usa este arquetipo para personalizar tus consejos.

      **DATOS DEL DRAFT ACTUAL:**
      - Mi Equipo (Picks): [${myTeamPicks.join(', ')}]
      - Equipo Enemigo (Picks): [${theirTeamPicks.join(', ')}]
      - Baneos Globales: [${bans.join(', ')}]

      **MISIÓN:**
      Basado en el draft y el perfil psicológico del jugador, proporciona un análisis estratégico en formato JSON.

      **FORMATO DE SALIDA (JSON ESTRICTO):**
      {
        "strategy": "Un consejo táctico conciso sobre la estrategia general, adaptado a la personalidad ${zodiacSign} (ej: 'Tu naturaleza de Aries se beneficia de esta composición de dive. Busca iniciar peleas.').",
        "earlyGame": "Un consejo clave para los primeros minutos, considerando su arquetipo (ej: 'Como Tauro, enfócate en un farmeo seguro hasta conseguir tu primer item core. No te dejes provocar en trades desfavorables.').",
        "firstItems": "Una recomendación de primer objeto crucial.",
        "runes": {
          "name": "MetaMind: [Nombre del Campeón]",
          "primaryStyleId": 8200, "subStyleId": 8100,
          "selectedPerkIds": [8214, 8226, 8210, 8237, 8126, 8135, 5008, 5002, 5003],
          "current": true
        }
      }
    `;
};

// --- PROMPT PARA ANÁLISIS DE RENDIMIENTO POST-PARTIDA ---
exports.createChampSelectPrompt = createChampSelectPrompt;
const createPerformanceAnalysisPrompt = (matchHistory, summonerData) => {
  return `
      Eres "MetaMind", un coach analítico. Analiza el historial de partidas de ${summonerData.summonerName}, cuyo arquetipo es ${summonerData.zodiacSign}.

      **PERFIL PSICOLÓGICO:**
      - **Arquetipo Zodiacal:** ${summonerData.zodiacSign}. Ten en cuenta si sus acciones en las partidas se alinean con las fortalezas de su arquetipo o si sus debilidades se manifiestan.

      **DATOS DE PARTIDAS:**
      ${JSON.stringify(matchHistory, null, 2)}

      **MISIÓN:**
      Identifica 2 puntos fuertes y 2 puntos a mejorar. Relaciona al menos un punto con su perfil psicológico.

      **FORMATO DE SALIDA (JSON ESTRICTO):**
      {
        "type": "performance",
        "puntosFuertes": [
            "Un punto fuerte objetivo basado en los datos.",
            "Otro punto fuerte (ej: 'Tu paciencia de Tauro se refleja en tu bajo número de muertes en early game. Excelente.')."
        ],
        "puntosAMejorar": [
            "Un área de mejora objetiva.",
            "Otra área de mejora (ej: 'Tu impulsividad de Aries te lleva a iniciar peleas en desventaja numérica. Trabaja en evaluar el mapa antes de entrar.')."
        ]
      }
    `;
};

// --- PROMPT PARA ANÁLISIS DEL META ACTUAL (Este es más objetivo, no necesita el signo) ---
exports.createPerformanceAnalysisPrompt = createPerformanceAnalysisPrompt;
// --- PROMPT PARA ANÁLISIS DEL META ACTUAL (Este es más objetivo, no necesita el signo) ---
const createMetaAnalysisPrompt = (patchVersion) => {
    // Definición completa del prompt para evitar el error 500 por 'customPrompt' vacío
    return `
      Eres "MetaMind", un analista de la Grieta del Invocador.

      **DATOS DE CONTEXTO:**
      - Versión del Parche Solicitada: ${patchVersion}.

      **MISIÓN:**
      Genera un análisis conciso del estado actual del meta de League of Legends en el parche **${patchVersion}**, centrándose en los cambios más impactantes en el juego profesional (Top, Jungla, Medio, ADC, Soporte).

      **FORMATO DE SALIDA (JSON ESTRICTO):**
      {
        "type": "meta",
        "patchVersion": "${patchVersion}",
        "tierListChanges": "Un resumen de los 3 campeones que subieron más de tier y los 3 que bajaron más, con una breve explicación.",
        "strategicFocus": "El objetivo macro principal del juego en este parche (ej: control de visión, peleas de equipo en mid-game, split-push).",
        "keyChampionToMaster": {
            "name": "Nombre de Campeón",
            "reason": "Por qué dominar a este campeón es clave para la victoria en este meta."
        }
      }
    `;
};
// --- TUS PROMPTS ORIGINALES (REFINADOS) ---

// Prompt para el análisis inicial del dashboard
exports.createMetaAnalysisPrompt = createMetaAnalysisPrompt;
const createInitialAnalysisPrompt = analysisData => {
  const {
    summonerName,
    zodiacSign,
    championMastery
  } = analysisData;
  const masterySummary = Array.isArray(championMastery) ? championMastery.map(champ => champ.name) : [];
  return `
    Eres "MetaMind", un coach de élite. Tu cliente es ${summonerName}.

    **PERFIL DEL JUGADOR:**
    - **Arquetipo Psicológico (Zodiaco):** ${zodiacSign}
    - **Arsenal Principal (Maestría):** [${masterySummary.join(', ')}]

    **MISIÓN:**
    Basado en su arquetipo y su arsenal, genera un análisis de su estilo de juego y recomienda campeones que se alineen con su personalidad o la desafíen para crecer.

    **FORMATO DE SALIDA (JSON ESTRICTO):**
    {
      "playstyleAnalysis": {
        "title": "Diagnóstico de tu Estilo de Juego",
        "style": "Tu arquetipo como jugador (ej: Duelista de Flanco)",
        "description": "Un análisis profesional de cómo tu arquetipo ${zodiacSign} y tus campeones de maestría definen tu forma de jugar."
      },
      "newChampionRecommendations": {
        "title": "Expansión de Arsenal",
        "synergy": {
          "champion": "Nombre del Campeón de Sinergia",
          "reason": "Por qué este campeón capitaliza las fortalezas naturales de un ${zodiacSign}."
        },
        "development": {
          "champion": "Nombre del Campeón de Desarrollo",
          "reason": "Por qué dominar a este campeón te ayudará a mitigar las debilidades típicas de un ${zodiacSign} y te hará un jugador más completo."
        }
      }
    }
  `;
};

// Prompt para generar desafíos
exports.createInitialAnalysisPrompt = createInitialAnalysisPrompt;
const createChallengeGenerationPrompt = playerData => {/* ... sin cambios, ya es bueno ... */};

// Prompt para "Nano Banana" (aquí también puede influir)
exports.createChallengeGenerationPrompt = createChallengeGenerationPrompt;
const createLiveCoachingPrompt = (liveGameData, zodiacSign) => {
  const gameInfo = JSON.stringify(liveGameData, null, 2);
  return `
    Eres "MetaMind", un coach de élite. Proporciona un consejo táctico para un jugador con arquetipo ${zodiacSign}.

    **DATOS DE PARTIDA (INSTANTÁNEA):**
    ${gameInfo}

    **MISIÓN:**
    Considerando la tendencia de un ${zodiacSign} a [ej: ser impulsivo/paciente], genera el consejo más relevante para la situación actual.

    **INSTRUCCIONES DE OUTPUT (JSON ESTRICTO):**
    { "realtimeAdvice": "Un consejo táctico conciso (ej: 'Como Aries, sé que quieres iniciar, pero espera a que tu equipo se agrupe.').", "priorityAction": "Una palabra clave (ej: WAIT, ENGAGE, RETREAT)." }
  `;
};
exports.createLiveCoachingPrompt = createLiveCoachingPrompt;