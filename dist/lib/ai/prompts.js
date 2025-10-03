"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createPerformanceAnalysisPrompt = exports.createMetaAnalysisPrompt = exports.createLiveCoachingPrompt = exports.createInitialAnalysisPrompt = exports.createChampSelectPrompt = exports.createChallengeGenerationPrompt = void 0;
// src/lib/ai/prompts.js - VERSIÓN CON INSTRUCCIONES CRÍTICAS PARA JSON ESTRICTO Y BAJA LATENCIA

// --- PROMPT PARA COACHING EN SELECCIÓN DE CAMPEÓN ---
const createChampSelectPrompt = (draftData, summonerData) => {
  // Lógica para mapear datos... (asumimos que la lógica interna sigue siendo la misma)
  const gameData = draftData?.gameData || {};
  const myTeamPicksRaw = gameData.teamOne || [];
  const theirTeamPicksRaw = gameData.teamTwo || [];
  const bansRaw = gameData.bannedChampions || [];
  const myTeamPicks = myTeamPicksRaw.map(p => p.championName || p.name || `ChampID:${p.id || ''}`).filter(Boolean);
  const theirTeamPicks = theirTeamPicksRaw.map(p => p.championName || p.name || `ChampID:${p.id || ''}`).filter(Boolean);
  const bans = bansRaw.map(b => b.championName || b.name || `ChampID:${b.id || ''}`).filter(Boolean);
  const {
    summonerName,
    zodiacSign
  } = summonerData;
  return `
      Eres "MetaMind", un coach de élite de League of Legends. Tu cliente es ${summonerName}.

      **PERFIL PSICOLÓGICO DEL JUGADOR:**
      - **Arquetipo Zodiacal:** ${zodiacSign}. Usa esto para personalizar tus consejos.

      **DATOS DEL DRAFT ACTUAL:**
      - Mi Equipo (Picks): [${myTeamPicks.join(', ')}]
      - Equipo Enemigo (Picks): [${theirTeamPicks.join(', ')}]
      - Baneos Globales: [${bans.join(', ')}]

      **MISIÓN:**
      Proporciona un análisis estratégico.

      **INSTRUCCIÓN CRÍTICA:** Debes responder **SOLO** con el objeto JSON. NO DEBES INCLUIR TEXTO ADICIONAL (SALUDOS, COMENTARIOS O EXPLICACIONES). Tu respuesta debe comenzar **INMEDIATAMENTE** con el carácter '{'.

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
  const performanceSummary = JSON.stringify(matchHistory, null, 2);
  return `
      Eres "MetaMind", un coach analítico. Analiza el historial de partidas de ${summonerData.summonerName}, cuyo arquetipo es ${summonerData.zodiacSign}.

      **PERFIL PSICOLÓGICO:**
      - **Arquetipo Zodiacal:** ${summonerData.zodiacSign}. Ten en cuenta si sus acciones se alinean con las fortalezas de su arquetipo.

      **DATOS DE PARTIDAS:**
      ${performanceSummary}

      **MISIÓN:**
      Identifica 2 puntos fuertes y 2 puntos a mejorar. Relaciona al menos un punto con su perfil psicológico.

      **INSTRUCCIÓN CRÍTICA:** Debes responder **SOLO** con el objeto JSON. NO DEBES INCLUIR TEXTO ADICIONAL. Tu respuesta debe comenzar **INMEDIATAMENTE** con el carácter '{'.

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

// --- PROMPT PARA ANÁLISIS DEL META ACTUAL ---
exports.createPerformanceAnalysisPrompt = createPerformanceAnalysisPrompt;
const createMetaAnalysisPrompt = patchVersion => {
  return `
      Eres "MetaMind", un analista de la Grieta del Invocador.

      **DATOS DE CONTEXTO:**
      - Versión del Parche Solicitada: ${patchVersion}.

      **MISIÓN:**
      Genera un análisis conciso del estado actual del meta de League of Legends.

      **INSTRUCCIÓN CRÍTICA:** Debes responder **SOLO** con el objeto JSON. NO DEBES INCLUIR TEXTO ADICIONAL. Tu respuesta debe comenzar **INMEDIATAMENTE** con el carácter '{'.

      **FORMATO DE SALIDA (JSON ESTRICTO):**
      {
        "type": "meta",
        "patchVersion": "${patchVersion}",
        "tierListChanges": "Un resumen de los 3 campeones que subieron más de tier y los 3 que bajaron más, con una breve explicación.",
        "strategicFocus": "El objetivo macro principal del juego en este parche.",
        "keyChampionToMaster": {
            "name": "Nombre de Campeón",
            "reason": "Por qué dominar a este campeón es clave para la victoria en este meta."
        }
      }
    `;
};

// --- Prompt para el análisis inicial del dashboard ---
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

    **INSTRUCCIÓN CRÍTICA:** Debes responder **SOLO** con el objeto JSON. NO DEBES INCLUIR TEXTO ADICIONAL. Tu respuesta debe comenzar **INMEDIATAMENTE** con el carácter '{'.

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

// --- PROMPT PARA GENERAR DESAFÍOS SEMANALES (Único que devuelve un Array) ---
exports.createInitialAnalysisPrompt = createInitialAnalysisPrompt;
const createChallengeGenerationPrompt = playerData => {
  const {
    summonerName,
    recentMatchesPerformance
  } = playerData;

  // Convertimos el objeto de rendimiento en una cadena legible para la IA
  const performanceSummary = JSON.stringify(recentMatchesPerformance, null, 2);
  return `
      Eres "MetaMind", un coach de élite de League of Legends enfocado en el crecimiento a largo plazo. Tu cliente es ${summonerName}.

      **ANÁLISIS DE RENDIMIENTO RECIENTE (5 Partidas):**
      ${performanceSummary}

      **MISIÓN:**
      Genera **3 Desafíos Semanales**. Si los datos de rendimiento son insuficientes, genera desafíos genéricos.

      **INSTRUCCIÓN CRÍTICA:** Debes responder **SOLO** con el array JSON. NO DEBES INCLUIR TEXTO ADICIONAL. Tu respuesta debe comenzar **INMEDIATAMENTE** con el carácter '['.

      **FORMATO DE SALIDA (JSON ESTRICTO):**
      Un array JSON que contiene 3 objetos. Cada objeto debe seguir estrictamente este esquema, que coincide con la estructura de la tabla 'user_challenges' de la base de datos:
      [
        {
          "title": "Desafío de Visión Estratégica",
          "description": "Alcanza un promedio de Puntuación de Visión de X en 5 partidas rankeadas, o un desafío similar si los datos son insuficientes.",
          "challenge_type": "weekly",
          "metric": "visionScore",
          "goal": 25.5,
          "reward": "Cofre MetaMind"
        },
        {
          "title": "Dominio del Farmeo Temprano",
          "description": "Supera tu 'csPerMinute' promedio en la fase de líneas.",
          "challenge_type": "weekly",
          "metric": "csPerMinute",
          "goal": 6.8, 
          "reward": "Emblema de Maestría"
        },
        {
          "title": "Control Agresivo de Objetivos",
          "description": "Mejora tu impacto en los objetivos globales. El desafío es alcanzar un 'killParticipation' alto.",
          "challenge_type": "weekly",
          "metric": "killParticipation",
          "goal": 0.65, 
          "reward": "Ícono de Invocador Único"
        }
      ]
    `;
};

// --- Prompt para el Live Coaching (Utilizado por WebSocket) ---
exports.createChallengeGenerationPrompt = createChallengeGenerationPrompt;
const createLiveCoachingPrompt = (liveGameData, zodiacSign) => {
  const gameInfo = JSON.stringify(liveGameData, null, 2);
  return `
    Eres "MetaMind", un coach de élite. Proporciona un consejo táctico para un jugador con arquetipo ${zodiacSign}.

    **DATOS DE PARTIDA (INSTANTÁNEA):**
    ${gameInfo}

    **MISIÓN:**
    Genera el consejo más relevante para la situación actual.

    **INSTRUCCIÓN CRÍTICA:** Debes responder **SOLO** con el objeto JSON. NO DEBES INCLUIR TEXTO ADICIONAL. Tu respuesta debe comenzar **INMEDIATAMENTE** con el carácter '{'.

    **INSTRUCCIONES DE OUTPUT (JSON ESTRICTO):**
    { "realtimeAdvice": "Un consejo táctico conciso (ej: 'Como Aries, sé que quieres iniciar, pero espera a que tu equipo se agrupe.').", "priorityAction": "Una palabra clave (ej: WAIT, ENGAGE, RETREAT)." }
  `;
};
exports.createLiveCoachingPrompt = createLiveCoachingPrompt;