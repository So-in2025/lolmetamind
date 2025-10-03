"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createPreGamePrompt = exports.createPerformanceAnalysisPrompt = exports.createMetaAnalysisPrompt = exports.createLiveCoachingPrompt = exports.createInitialAnalysisPrompt = exports.createChampSelectPrompt = exports.createChallengeGenerationPrompt = void 0;
// src/lib/ai/prompts.js - VERSIÓN FINAL Y COMPLETA (ASTRO-TÉCNICA INTERNA)

// --- PROMPT PARA COACHING EN SELECCIÓN DE CAMPEÓN ---
const createChampSelectPrompt = (draftData, summonerData) => {
  const gameData = draftData?.gameData || {};
  const myTeamPicks = (gameData.teamOne || []).map(p => p.championName || p.name).filter(Boolean);
  const theirTeamPicks = (gameData.teamTwo || []).map(p => p.championName || p.name).filter(Boolean);
  const bans = (gameData.bannedChampions || []).map(b => b.championName || b.name).filter(Boolean);
  const {
    zodiacSign
  } = summonerData;
  return `
      Eres "MetaMind", un coach de élite de League of Legends.
      **PERFIL PSICOLÓGICO:** Arquetipo Zodiacal: ${zodiacSign}.
      **DRAFT ACTUAL:** Mi Equipo: [${myTeamPicks.join(', ')}], Equipo Enemigo: [${theirTeamPicks.join(', ')}], Baneos: [${bans.join(', ')}].
      **MISIÓN:** Proporciona un análisis estratégico.
      **INSTRUCCIÓN CRÍTICA:** Responde SOLO con el objeto JSON. No incluyas texto adicional. Tu respuesta debe comenzar INMEDIATAMENTE con '{'.
      **FORMATO DE SALIDA (JSON ESTRICTO):**
      {
        "strategy": "Un consejo táctico conciso sobre la estrategia general, adaptado a la personalidad ${zodiacSign}.",
        "earlyGame": "Un consejo clave para los primeros minutos.",
        "firstItems": "Una recomendación de primer objeto crucial.",
        "runes": {"name": "MetaMind: Runas","primaryStyleId":8200,"subStyleId":8100,"selectedPerkIds":[8214,8226,8210,8237,8126,8135,5008,5002,5003],"current":true}
      }
    `;
};

// --- PROMPT PARA ANÁLISIS DE RENDIMIENTO POST-PARTIDA ---
exports.createChampSelectPrompt = createChampSelectPrompt;
const createPerformanceAnalysisPrompt = (matchHistory, summonerData) => {
  const performanceSummary = JSON.stringify(matchHistory, null, 2);
  return `
      Eres "MetaMind", un coach analítico. Analiza el historial de partidas para un jugador con arquetipo ${summonerData.zodiacSign}.
      **DATOS DE PARTIDAS:** ${performanceSummary}
      **MISIÓN:** Identifica 2 puntos fuertes y 2 a mejorar. Relaciona uno al perfil psicológico.
      **INSTRUCCIÓN CRÍTICA:** Responde SOLO con el objeto JSON. Comienza INMEDIATAMENTE con '{'.
      **FORMATO DE SALIDA (JSON ESTRICTO):**
      {"type":"performance","puntosFuertes":["Punto fuerte objetivo.","Punto fuerte ligado al arquetipo."],"puntosAMejorar":["Área de mejora objetiva.","Área de mejora ligada al arquetipo."]}
    `;
};

// --- PROMPT PARA ANÁLISIS DEL META ACTUAL ---
exports.createPerformanceAnalysisPrompt = createPerformanceAnalysisPrompt;
const createMetaAnalysisPrompt = patchVersion => {
  return `
      Eres "MetaMind", un analista del meta.
      **MISIÓN:** Genera un análisis conciso del meta para el parche ${patchVersion}.
      **INSTRUCCIÓN CRÍTICA:** Responde SOLO con el objeto JSON. Comienza INMEDIATAMENTE con '{'.
      **FORMATO DE SALIDA (JSON ESTRICTO):**
      {"type":"meta","patchVersion":"${patchVersion}","tierListChanges":"Resumen de 3 campeones que subieron y 3 que bajaron.","strategicFocus":"El objetivo macro principal del parche.","keyChampionToMaster":{"name":"Campeón Clave","reason":"Por qué dominarlo es clave."}}
    `;
};

// --- PROMPT PARA ANÁLISIS INICIAL DEL DASHBOARD ---
exports.createMetaAnalysisPrompt = createMetaAnalysisPrompt;
const createInitialAnalysisPrompt = analysisData => {
  const {
    zodiacSign,
    championMastery
  } = analysisData;
  const masterySummary = Array.isArray(championMastery) ? championMastery.map(champ => champ.name) : [];
  return `
    Eres "MetaMind", un coach de élite.
    **PERFIL:** Arquetipo Psicológico (Zodiaco): ${zodiacSign}, Arsenal Principal: [${masterySummary.join(', ')}].
    **MISIÓN:** Genera un análisis de estilo de juego y recomienda campeones.
    **INSTRUCCIÓN CRÍTICA:** Responde SOLO con el objeto JSON. Comienza INMEDIATAMENTE con '{'.
    **FORMATO DE SALIDA (JSON ESTRICTO):**
    {"playstyleAnalysis":{"title":"Diagnóstico de tu Estilo de Juego","style":"Tu arquetipo como jugador","description":"Análisis de cómo tu arquetipo y campeones definen tu forma de jugar."},"newChampionRecommendations":{"title":"Expansión de Arsenal","synergy":{"champion":"Campeón de Sinergia","reason":"Razón de la sinergia."},"development":{"champion":"Campeón de Desarrollo","reason":"Razón del desarrollo."}}}
  `;
};

// --- PROMPT PARA GENERAR DESAFÍOS SEMANALES ---
exports.createInitialAnalysisPrompt = createInitialAnalysisPrompt;
const createChallengeGenerationPrompt = playerData => {
  const {
    recentMatchesPerformance
  } = playerData;
  const performanceSummary = JSON.stringify(recentMatchesPerformance, null, 2);
  return `
      Eres "MetaMind", un coach de élite.
      **ANÁLISIS DE RENDIMIENTO:** ${performanceSummary}
      **MISIÓN:** Genera 3 Desafíos Semanales. Si no hay datos, genera desafíos genéricos.
      **INSTRUCCIÓN CRÍTICA:** Responde SOLO con el array JSON. Comienza INMEDIATAMENTE con '['.
      **FORMATO DE SALIDA (JSON ESTRICTO):**
      [{"title":"Desafío 1","description":"Descripción 1","challenge_type":"weekly","metric":"visionScore","goal":25.5,"reward":"Cofre MetaMind"},{"title":"Desafío 2","description":"Descripción 2","challenge_type":"weekly","metric":"csPerMinute","goal":6.8,"reward":"Emblema de Maestría"},{"title":"Desafío 3","description":"Descripción 3","challenge_type":"weekly","metric":"killParticipation","goal":0.65,"reward":"Ícono de Invocador"}]
    `;
};

// --- PROMPT PARA LIVE COACHING (WEBSOCKET) ---
exports.createChallengeGenerationPrompt = createChallengeGenerationPrompt;
const createLiveCoachingPrompt = (liveGameData, zodiacSign) => {
  const gameInfo = JSON.stringify(liveGameData, null, 2);
  return `
    Eres "MetaMind", un coach de élite para un jugador ${zodiacSign}.
    **DATOS DE PARTIDA:** ${gameInfo}
    **MISIÓN:** Genera el consejo más relevante para la situación.
    **INSTRUCCIÓN CRÍTICA:** Responde SOLO con el objeto JSON. Comienza INMEDIATAMENTE con '{'.
    **FORMATO DE SALIDA (JSON ESTRICTO):**
    { "realtimeAdvice": "Un consejo táctico conciso.", "priorityAction": "WAIT | ENGAGE | RETREAT" }
  `;
};

// --- 💎 PROMPT ASTRO-TÉCNICO PARA PRE-PARTIDA (INTERNO) 💎 ---
exports.createLiveCoachingPrompt = createLiveCoachingPrompt;
const createPreGamePrompt = (userData, performanceData) => {
  const {
    zodiacSign,
    favRole1,
    favChamp1
  } = userData;
  const performanceSummary = JSON.stringify(performanceData, null, 2);
  return `
    Eres "MetaMind", un coach astro-técnico de League of Legends con amplio conocimiento en arcanos y estrategia.
    Tu tarea es preparar mentalmente a un jugador para su próxima partida.

    **CONTEXTO ASTROLÓGICO DEL DÍA (AUTO-GENERADO):**
    - **INSTRUCCIÓN CRÍTICA:** Como experto en astrología y League of Legends, genera un **consejo de horóscopo del día específico para el signo ${zodiacSign}** y aplícalo a la mentalidad de juego.

    **PERFIL DEL JUGADOR:**
    - **Arquetipo Psicológico (Zodiaco):** ${zodiacSign}.
    - **Enfoque Principal:** Rol ${favRole1} con ${favChamp1}.
    - **Historial de Rendimiento (Puntos Clave a Mejorar):** ${performanceSummary}

    **MISIÓN:**
    Basado en la predicción astral auto-generada y los puntos débiles detectados en su historial, genera un consejo de mentalidad pre-partida y un punto de enfoque técnico. No menciones el nombre de invocador ni campeones.

    **INSTRUCCIÓN CRÍTICA:** Responde **SOLO** con el objeto JSON. NO DEBES INCLUIR TEXTO ADICIONAL. Tu respuesta debe comenzar **INMEDIATAMENTE** con '{'.

    **FORMATO DE SALIDA (JSON ESTRICTO):**
    {
      "preGameAnalysis": {
        "title": "Mentalidad Pre Partida",
        "astralMantra": "Un consejo de mentalidad corto y potente que conecte la predicción del horóscopo con una actitud ganadora en el juego (ej: 'Los astros predicen un día de gran energía vital. Canaliza esa fuerza en iniciaciones decisivas y no dudes de tus instintos de liderazgo.').",
        "technicalFocus": "Un consejo técnico específico y accionable basado en sus puntos a mejorar, conectándolo con su rol o campeón principal (ej: 'Tu historial muestra que tu KDA sufre en el juego medio. Como ${favRole1}, enfócate en rotar a objetivos neutrales solo después de asegurar la visión en el río. Evita las peleas sin información.')"
      }
    }
  `;
};
exports.createPreGamePrompt = createPreGamePrompt;