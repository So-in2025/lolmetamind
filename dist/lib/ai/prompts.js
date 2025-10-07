"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createPreGamePrompt = exports.createPerformanceAnalysisPrompt = exports.createMetaAnalysisPrompt = exports.createLiveCoachingPrompt = exports.createInitialAnalysisPrompt = exports.createChampSelectPrompt = exports.createChallengeGenerationPrompt = void 0;
// src/lib/ai/prompts.js - VERSIÓN FINAL Y CORREGIDA (ASTRO-TÉCNICA INTERNA)

// --- PROMPT PARA COACHING EN SELECCIÓN DE CAMPEÓN (DRAFT MIND-MAP) ---
const createChampSelectPrompt = (draftData, summonerData) => {
  const gameData = draftData?.gameData || {};
  const myTeamPicks = (gameData.teamOne || []).map(p => p.championName || p.name).filter(Boolean);
  const theirTeamPicks = (gameData.teamTwo || []).map(p => p.championName || p.name).filter(Boolean);
  const bans = (gameData.bannedChampions || []).map(b => b.championName || b.name).filter(Boolean);
  const {
    zodiacSign,
    favRole1
  } = summonerData;
  return `
Eres "MetaMind", un coach de élite de League of Legends.
Tu objetivo es proporcionar una Matriz de Prioridad de Draft inmediata y actionable.

PERFIL PSICOLÓGICO: Arquetipo Zodiacal: ${zodiacSign}. Rol principal: ${favRole1}.
DRAFT ACTUAL: Mi Equipo: [${myTeamPicks.join(', ')}], Equipo Enemigo: [${theirTeamPicks.join(', ')}], Baneos: [${bans.join(', ')}].

MISIÓN: Analiza el draft y genera 4 métricas concisas para el jugador.
INSTRUCCIÓN CRÍTICA: Responde SOLO con el objeto JSON. No incluyas texto adicional. Tu respuesta debe comenzar INMEDIATAMENTE con '{'.

FORMATO DE SALIDA (JSON ESTRICTO):
{
  "draftScore": 78,
  "metaAdvantage": "La composición de poke enemiga es débil contra tu iniciación sorpresa. Aprovecha la prioridad en Mid para asegurar la visión en Dragón.",
  "phaseFocus": "MID-GAME",
  "playerRoleAction": "STALL & CONTROL",
  "runes": {
    "name": "MetaMind: Runas",
    "primaryStyleId": 8200,
    "subStyleId": 8100,
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
Eres "MetaMind", un coach analítico. Analiza el historial de partidas para un jugador con arquetipo ${summonerData.zodiacSign}.
DATOS DE PARTIDAS: ${performanceSummary}
MISIÓN: Identifica 2 puntos fuertes y 2 a mejorar. Relaciona uno al perfil psicológico.
INSTRUCCIÓN CRÍTICA: Responde SOLO con el objeto JSON. Comienza INMEDIATAMENTE con '{'.

FORMATO DE SALIDA (JSON ESTRICTO):
{
  "type": "performance",
  "puntosFuertes": ["Punto fuerte objetivo.", "Punto fuerte ligado al arquetipo."],
  "puntosAMejorar": ["Área de mejora objetiva.", "Área de mejora ligada al arquetipo."]
}
`;
};

// --- PROMPT PARA ANÁLISIS DEL META ACTUAL ---
exports.createPerformanceAnalysisPrompt = createPerformanceAnalysisPrompt;
const createMetaAnalysisPrompt = patchVersion => {
  return `
Eres "MetaMind", un analista del meta.
MISIÓN: Genera un análisis conciso del meta para el parche ${patchVersion}.
INSTRUCCIÓN CRÍTICA: Responde SOLO con el objeto JSON. Comienza INMEDIATAMENTE con '{'.

FORMATO DE SALIDA (JSON ESTRICTO):
{
  "type": "meta",
  "patchVersion": "${patchVersion}",
  "tierListChanges": "Resumen de 3 campeones que subieron y 3 que bajaron.",
  "strategicFocus": "El objetivo macro principal del parche.",
  "keyChampionToMaster": { "name": "Campeón Clave", "reason": "Por qué dominarlo es clave." }
}
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
PERFIL: Arquetipo Psicológico (Zodiaco): ${zodiacSign}, Arsenal Principal: [${masterySummary.join(', ')}].
MISIÓN: Genera un análisis de estilo de juego y recomienda campeones.
INSTRUCCIÓN CRÍTICA: Responde SOLO con el objeto JSON. Comienza INMEDIATAMENTE con '{'.

FORMATO DE SALIDA (JSON ESTRICTO):
{
  "playstyleAnalysis": {
    "title": "Diagnóstico de tu Estilo de Juego",
    "style": "Tu arquetipo como jugador",
    "description": "Análisis de cómo tu arquetipo y campeones definen tu forma de jugar."
  },
  "newChampionRecommendations": {
    "title": "Expansión de Arsenal",
    "synergy": { "champion": "Campeón de Sinergia", "reason": "Razón de la sinergia." },
    "development": { "champion": "Campeón de Desarrollo", "reason": "Razón del desarrollo." }
  }
}
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
ANÁLISIS DE RENDIMIENTO: ${performanceSummary}
MISIÓN: Genera 3 Desafíos Semanales. Si no hay datos, genera desafíos genéricos.
INSTRUCCIÓN CRÍTICA: Responde SOLO con el array JSON. Comienza INMEDIATAMENTE con '['.

FORMATO DE SALIDA (JSON ESTRICTO):
[
  { "title": "Desafío 1", "description": "Descripción 1", "challenge_type": "weekly", "metric": "visionScore", "goal": 25.5, "reward": "Cofre MetaMind" },
  { "title": "Desafío 2", "description": "Descripción 2", "challenge_type": "weekly", "metric": "csPerMinute", "goal": 6.8, "reward": "Emblema de Maestría" },
  { "title": "Desafío 3", "description": "Descripción 3", "challenge_type": "weekly", "metric": "killParticipation", "goal": 0.65, "reward": "Ícono de Invocador" }
]
`;
};

// --- PROMPT PARA PRE-PARTIDA (ASTRO-TÉCNICO) ---
// Produce un objeto JSON que incluye "fullText" (párrafo continuo, optimizado para TTS)
// y, opcionalmente, campos separados para UI (title, astralMantra, technicalFocus).
exports.createChallengeGenerationPrompt = createChallengeGenerationPrompt;
const createPreGamePrompt = (userData, performanceData) => {
  const {
    zodiacSign,
    favRole1,
    favChamp1
  } = userData;
  const performanceSummary = JSON.stringify(performanceData || {}, null, 2);
  return `
Eres "MetaMind", un coach astro-técnico experto en League of Legends. Tu tarea es generar UN SOLO CONSEJO pre-partida que suene completamente natural al leerlo en voz alta. NO cortes la narración en listas ni subtítulos; produce un párrafo coherente y fluido optimizado para TTS (pausas naturales usando puntuación), pero también devuelve campos separados para UI.

CONTEXT:
- Signo: ${zodiacSign}
- Rol: ${favRole1}
- Campeón principal: ${favChamp1}
- Historial/resumen: ${performanceSummary}

REGLAS IMPORTANTES:
1) Responde SOLO con un objeto JSON, empezando INMEDIATAMENTE con '{' (sin texto adicional).
2) El campo principal debe ser "fullText": un único párrafo natural, pensado para leerse entero por TTS.
3) Puedes incluir también "title", "astralMantra" y "technicalFocus" como campos cortos para mostrar en UI, pero NUNCA uses esos campos para romper la narrativa: el "fullText" debe ser la versión natural y continua.
4) Evita encabezados tipo "Foco técnico:" que provoquen cortes bruscos en la lectura. Usa frases integradas.
5) Sé concreto y accionable. Menos vaguedad, más pasos aplicables en la fase pre-partida.

FORMATO DE SALIDA (JSON estricto):
{
  "preGameAnalysis": {
    "title": "Título breve para UI",
    "astralMantra": "Frase corta de mentalidad (1-2 oraciones).",
    "technicalFocus": "Una frase técnica concretísima (acción inmediata).",
    "fullText": "Consejo continuo y natural optimizado para TTS. Debe leerse como un párrafo, con pausas naturales y sin estructuras tipo 'Foco técnico:'."
  }
}
`;
};

// --- PROMPT PARA LIVE COACHING (EN JUEGO) ---
// Genera un JSON con fullText natural para TTS y campos auxiliares.
// fullText: una única oración/párrafo conciso optimizado para actuación inmediata.
exports.createPreGamePrompt = createPreGamePrompt;
const createLiveCoachingPrompt = (liveGameData, zodiacSign) => {
  const gameInfo = JSON.stringify(liveGameData || {}, null, 2);
  return `
Eres "MetaMind", un coach táctico en vivo para un jugador de signo ${zodiacSign}. Analiza la situación actual de la partida y genera un consejo táctico inmediato QUE SE LEA NATURALMENTE EN VOZ ALTA. Devuelve UN SOLO párrafo en "fullText" que incluya la recomendación y la razón breve. También puedes devolver campos auxiliares para UI (priorityAction) pero el campo primario debe ser fullText y estar optimizado para TTS (sin listas ni etiquetas).

CONTEXT: ${gameInfo}

REGLAS:
- Responde SOLO con un objeto JSON empezando inmediatamente con '{'.
- "fullText": consejo en un solo bloque natural, apto para ser leído por TTS.
- "priorityAction": un valor corto entre "WAIT", "ENGAGE", "RETREAT" para UI.
- No uses encabezados que corten la narración. No devuelvas texto fuera del JSON.

FORMATO (JSON estricto):
{
  "realtimeAdvice": {
    "fullText": "Texto continuo optimizado para TTS.",
    "priorityAction": "WAIT|ENGAGE|RETREAT"
  }
}
`;
};
exports.createLiveCoachingPrompt = createLiveCoachingPrompt;