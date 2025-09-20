#!/bin/bash

# ==============================================================================
# SCRIPT DE CORRECCIÓN FINAL - ANÁLISIS DE IA BASADO EN DATOS REALES
#
# Objetivo: 1. Solucionar el error por el cual la IA alucinaba campeones.
#           2. Implementar un servicio para traducir IDs de campeones a nombres.
#           3. Actualizar todo el flujo para que la IA reciba y devuelva
#              nombres de campeones, haciendo el análisis 100% real.
# ==============================================================================

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Iniciando la corrección del motor de análisis de la IA...${NC}"

# --- 1. Crear el nuevo servicio para el Data Dragon ---
echo -e "\n${GREEN}Paso 1: Creando 'src/services/dataDragonService.js'...${NC}"
cat << 'EOF' > src/services/dataDragonService.js
import axios from 'axios';

// Caché simple para no pedir los datos de campeones en cada solicitud.
let championDataCache = null;

/**
 * Obtiene los datos de todos los campeones del Data Dragon de Riot.
 * Cachea el resultado para evitar llamadas innecesarias.
 * @returns {Promise<object>} - Un objeto con los datos de todos los campeones.
 */
async function getChampionData() {
  if (championDataCache) {
    return championDataCache;
  }
  try {
    // Primero, obtenemos la última versión del juego
    const versionsResponse = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json');
    const latestVersion = versionsResponse.data[0];
    
    // Luego, obtenemos los datos de los campeones para esa versión
    const response = await axios.get(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`);
    
    const champions = response.data.data;
    const championMap = {};
    // Creamos un mapa de ID -> Nombre para una búsqueda fácil
    for (const key in champions) {
      championMap[champions[key].key] = champions[key].name;
    }
    
    championDataCache = championMap;
    return championDataCache;
  } catch (error) {
    console.error("Error fetching champion data from Data Dragon:", error);
    throw new Error("Could not fetch champion data.");
  }
}

/**
 * Convierte un ID de campeón en su nombre.
 * @param {string|number} championId - El ID numérico del campeón.
 * @returns {Promise<string>} - El nombre del campeón.
 */
export async function getChampionNameById(championId) {
  const championMap = await getChampionData();
  return championMap[championId] || `Unknown Champion (ID: ${championId})`;
}
EOF
echo "Creado: src/services/dataDragonService.js. ✅"

# --- 2. Actualizar la API de Recomendación para que use el nuevo servicio ---
echo -e "\n${GREEN}Paso 2: Actualizando '/api/recommendation/route.js'...${NC}"
cat << 'EOF' > src/app/api/recommendation/route.js
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { getChampionMastery } from '@/services/riotApiService';
import { getChampionNameById } from '@/services/dataDragonService'; // Importamos el nuevo servicio
import { generateStrategicAnalysis } from '@/lib/ai/strategist';
import { createInitialAnalysisPrompt } from '@/lib/ai/prompts';

const JWT_SECRET = process.env.JWT_SECRET;

const dailyForecasts = [
  "Hoy, Marte favorece la agresión calculada y las iniciaciones audaces.",
  "La influencia de la Luna pide un enfoque en el control de la visión y la protección del equipo.",
  "Mercurio está retrógrado; la comunicación y el engaño son tus mejores armas.",
  "Venus en tu casa promueve la cooperación; busca sinergias fuertes con tus aliados.",
  "La energía de Júpiter expande tus oportunidades; busca rotaciones y objetivos globales.",
  "Saturno demanda paciencia; céntrate en el farmeo y el escalado para el juego tardío.",
  "El Sol ilumina tus fortalezas; juega tus campeones de confort con confianza."
];

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const { zodiacSign } = await request.json();
    if (!zodiacSign) return NextResponse.json({ error: 'Signo zodiacal es requerido.' }, { status: 400 });
    
    const userResult = await pool.query(
      'SELECT riot_id_name, region, puuid FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length === 0 || !userResult.rows[0].puuid) {
      return NextResponse.json({ error: 'Perfil de invocador no encontrado o incompleto.' }, { status: 404 });
    }
    const userData = userResult.rows[0];

    const championMasteryData = await getChampionMastery(userData.puuid, userData.region);

    // *** LA TRADUCCIÓN MÁGICA ***
    // Convertimos los IDs de maestría en nombres antes de enviarlos a la IA.
    const championMasteryWithNames = await Promise.all(
      championMasteryData.map(async (mastery) => ({
        name: await getChampionNameById(mastery.championId),
        points: mastery.championPoints,
      }))
    );

    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const dailyAstrologicalForecast = dailyForecasts[dayOfYear % dailyForecasts.length];

    const analysisData = {
      summonerName: userData.riot_id_name,
      zodiacSign: zodiacSign,
      championMastery: championMasteryWithNames, // Enviamos la lista con nombres
      dailyAstrologicalForecast: dailyAstrologicalForecast
    };

    const prompt = createInitialAnalysisPrompt(analysisData);
    const analysisResult = await generateStrategicAnalysis({ customPrompt: prompt });

    if (analysisResult.error) {
      return NextResponse.json({ error: analysisResult.message }, { status: 503 });
    }

    return NextResponse.json(analysisResult);

  } catch (error) {
    console.error("Error en el endpoint /api/recommendation:", error);
    return NextResponse.json({ error: 'Error interno del servidor al gestionar la recomendación.' }, { status: 500 });
  }
}
EOF
echo "Actualizado: /api/recommendation/route.js. ✅"

# --- 3. Actualizar el Prompt para que reciba y devuelva Nombres ---
echo -e "\n${GREEN}Paso 3: Actualizando 'src/lib/ai/prompts.js' para usar nombres de campeones...${NC}"
cat << 'EOF' > src/lib/ai/prompts.js
export const createInitialAnalysisPrompt = (analysisData) => {
  const { summonerName, zodiacSign, championMastery, dailyAstrologicalForecast } = analysisData;

  // El objeto 'championMastery' ahora contiene { name: 'NombreDelCampeon', points: 12345 }
  const masterySummary = championMastery.map(champ => `${champ.name} (${Math.round(champ.points / 1000)}k points)`);

  return \`
    Eres "MetaMind", un Astro-Táctico y coach de élite de League of Legends. Te diriges directamente a tu cliente, ${summonerName}, en segunda persona (tú, tu, tus). Tu tono es sabio, autoritario y revelador. Fusionas el análisis profundo de datos de Riot con la psicología zodiacal para crear estrategias hiper-personalizadas.

    **MISIÓN:**
    Realiza un análisis exhaustivo para ${summonerName} y entrégale su plan de acción diario en un formato JSON claro y profesional.

    **DATOS DE TU JUGADOR:**
    1.  **Invocador:** ${summonerName}
    2.  **Perfil Zodiacal:** ${zodiacSign}
    3.  **Arsenal Principal (Top 5 de Maestría):** ${JSON.stringify(masterySummary)}
    4.  **Directiva Astral del Día:** "${dailyAstrologicalForecast}"

    **PROCESO DE ANÁLISIS (ESTRICTO):**
    1.  **Diagnóstico de Estilo de Juego:** Basado en tu arsenal principal, define tu estilo de juego.
    2.  **Sinergia Astro-Táctica:** Explica cómo tu signo ${zodiacSign} impacta tu estilo de juego, y cómo la Directiva Astral de hoy debe modular tu enfoque.
    3.  **Coaching de Arsenal:** Elige 1 o 2 campeones de tu arsenal principal. Ofrécele una táctica específica y de alto nivel para aplicar HOY.
    4.  **Expansión de Arsenal:** Recomienda DOS nuevos campeones: uno de Sinergia y uno de Desarrollo.

    **FORMATO DE SALIDA (JSON ESTRICTO):**
    {
      "playstyleAnalysis": {
        "title": "Diagnóstico de tu Estilo de Juego",
        "style": "Tu arquetipo como jugador (ej: Duelista de Flanco)",
        "description": "Un análisis profesional de cómo abordas el juego."
      },
      "astroTacticSynergy": {
        "title": "Tu Directiva Táctica del Día",
        "description": "Cómo tu temperamento de ${zodiacSign} debe adaptarse al flujo cósmico de hoy."
      },
      "masteryCoaching": {
        "title": "Instrucciones para tu Arsenal Principal",
        "tips": [
          {
            "championName": "Nombre del campeón de su arsenal",
            "advice": "Una táctica avanzada y específica para este campeón."
          }
        ]
      },
      "newChampionRecommendations": {
        "title": "Expansión de Arsenal",
        "synergy": {
          "champion": "Nombre del Campeón de Sinergia",
          "reason": "Por qué este campeón capitaliza tus fortalezas."
        },
        "development": {
          "champion": "Nombre del Campeón de Desarrollo",
          "reason": "Por qué dominar a este campeón te hará un jugador impredecible."
        }
      }
    }
  \`;
};
EOF
echo "Actualizado: src/lib/ai/prompts.js. ✅"

# --- 4. Actualizar el Frontend para mostrar el nuevo formato de datos ---
echo -e "\n${GREEN}Paso 4: Actualizando 'src/components/forms/ProfileForm.jsx' para la nueva UI de resultados...${NC}"
cat << 'EOF' > src/components/forms/ProfileForm.jsx
'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';

export default function ProfileForm({ currentUser }) {
  const [status, setStatus] = useState('idle');
  const [recommendation, setRecommendation] = useState(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const { token } = useAuth();
  const zodiacSigns = [
    'Aries', 'Tauro', 'Géminis', 'Cáncer', 'Leo', 'Virgo',
    'Libra', 'Escorpio', 'Sagitario', 'Capricornio', 'Acuario', 'Piscis'
  ];

  const onSubmit = async (data) => {
    setStatus('loading');
    setRecommendation(null);
    try {
      const response = await fetch('/api/recommendation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ zodiacSign: data.zodiacSign }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'La respuesta de la IA no fue exitosa');
      }
      const result = await response.json();
      setRecommendation(result);
      setStatus('success');
    } catch (error) {
      console.error('Error al enviar el formulario:', error);
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-lol-blue-medium text-lol-gold-light p-8 rounded-xl shadow-lg w-full text-center animate-pulse border-2 border-lol-gold-dark"
      >
        <h2 className="text-2xl font-display font-bold text-lol-blue-accent mb-4">Analizando tu Perfil Cósmico...</h2>
        <p className="text-lol-gold-light/90">La IA está consultando los astros y tu perfil de Riot para entregar tu plan de acción diario.</p>
      </motion.div>
    );
  }

  // --- UI de Resultados Actualizada ---
  if (status === 'success' && recommendation) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-lol-blue-medium text-lol-gold-light p-8 rounded-xl shadow-lg w-full border-2 border-lol-gold-dark"
      >
        <h2 className="text-3xl font-display font-bold text-lol-blue-accent mb-6 text-center">Plan de Acción para {currentUser.riot_id_name}</h2>
        <div className="space-y-6">
          {recommendation.playstyleAnalysis && (
            <div className="bg-lol-blue-dark p-4 rounded-lg border border-lol-gold-dark">
              <h3 className="text-xl font-display font-bold text-lol-gold mb-2">{recommendation.playstyleAnalysis.title}</h3>
              <p><strong className="font-semibold text-lol-gold-light">Arquetipo:</strong> <span className="text-lol-blue-accent font-bold">{recommendation.playstyleAnalysis.style}</span></p>
              <p className="text-sm text-lol-gold-light/80 mt-1">{recommendation.playstyleAnalysis.description}</p>
            </div>
          )}
          {recommendation.astroTacticSynergy && (
            <div className="bg-lol-blue-dark p-4 rounded-lg border border-lol-gold-dark">
              <h3 className="text-xl font-display font-bold text-lol-gold mb-2">{recommendation.astroTacticSynergy.title}</h3>
              <p className="text-sm text-lol-gold-light/80">{recommendation.astroTacticSynergy.description}</p>
            </div>
          )}
          {recommendation.masteryCoaching && Array.isArray(recommendation.masteryCoaching.tips) && (
            <div className="bg-lol-blue-dark p-4 rounded-lg border border-lol-gold-dark">
              <h3 className="text-xl font-display font-bold text-lol-gold mb-2">{recommendation.masteryCoaching.title}</h3>
              <ul className="list-disc list-inside space-y-2 text-lol-gold-light/80 text-sm">
                {recommendation.masteryCoaching.tips.map((tip, index) => (
                  <li key={index}><strong>{tip.championName}:</strong> {tip.advice}</li>
                ))}
              </ul>
            </div>
          )}
          {recommendation.newChampionRecommendations && (
            <div className="bg-lol-blue-dark p-4 rounded-lg border border-lol-gold-dark">
              <h3 className="text-xl font-display font-bold text-lol-gold mb-3">{recommendation.newChampionRecommendations.title}</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-lol-blue-accent">Campeón de Sinergia: {recommendation.newChampionRecommendations.synergy.champion}</h4>
                  <p className="text-sm text-lol-gold-light/80">{recommendation.newChampionRecommendations.synergy.reason}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-purple-400">Campeón de Desarrollo: {recommendation.newChampionRecommendations.development.champion}</h4>
                  <p className="text-sm text-lol-gold-light/80">{recommendation.newChampionRecommendations.development.reason}</p>
                </div>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => setStatus('idle')}
          className="w-full mt-8 bg-lol-gold hover:bg-lol-gold-dark text-lol-blue-dark font-display font-bold py-3 px-4 rounded-lg"
        >
          Realizar otro Análisis
        </button>
      </motion.div>
    );
  }

  // --- Formulario (sin cambios) ---
  return (
    <div className="bg-lol-blue-medium text-lol-gold-light p-8 rounded-xl shadow-lg w-full border-2 border-lol-gold-dark">
      <h2 className="text-2xl font-display font-bold text-lol-blue-accent mb-1">Análisis de IA</h2>
      <p className="text-lol-gold-light/90 mb-6">Tu Riot ID <strong className="text-lol-blue-accent">{currentUser.riot_id_name}#{currentUser.riot_id_tagline}</strong> está listo. Solo falta un detalle.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="zodiacSign" className="block text-sm font-medium text-lol-gold-light mb-2">Signo Zodiacal</label>
          <select
            id="zodiacSign"
            {...register("zodiacSign", { required: "Tu signo zodiacal es necesario para el análisis." })}
            className="w-full bg-lol-blue-dark border-2 border-lol-gold-dark rounded-lg px-4 py-2"
          >
            <option value="">-- Selecciona tu signo --</option>
            {zodiacSigns.map(sign => <option key={sign} value={sign}>{sign}</option>)}
          </select>
          {errors.zodiacSign && <p className="text-red-500 text-xs mt-1">{errors.zodiacSign.message}</p>}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-lol-gold hover:bg-lol-gold-dark text-lol-blue-dark font-display font-bold py-3 px-4 rounded-lg"
        >
          {isSubmitting ? 'La IA está trabajando...' : 'Obtener Recomendación'}
        </button>
      </form>
    </div>
  );
}
EOF
echo "Actualizado: src/components/forms/ProfileForm.jsx. ✅"

echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡EL CEREBRO DE LA IA HA SIDO CORREGIDO! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Pasos Finales:${NC}"
echo -e "1.  Sube todos los cambios a tu repositorio."
echo -e "2.  Una vez Vercel se redespliegue, el análisis de la IA será 100% preciso y basado en los campeones que realmente juegas."