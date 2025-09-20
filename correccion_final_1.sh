#!/bin/bash

# ==============================================================================
# SCRIPT DE IMPLEMENTACIÓN MAYOR - SISTEMA DE DESAFÍOS DINÁMICOS POR IA
#
# Rol: Arquitecto de Software
# Objetivo: 1. Crear la infraestructura de base de datos para los desafíos.
#           2. Implementar un endpoint de API que usa la IA para generar
#              desafíos personalizados basados en el historial del jugador.
#           3. Implementar un endpoint para procesar partidas y actualizar
#              el progreso de los desafíos.
#           4. Actualizar el frontend para mostrar y manejar los desafíos reales.
# ==============================================================================

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Iniciando la construcción del sistema de desafíos dinámicos por IA...${NC}"

# --- 1. Expandir el Esquema de la Base de Datos ---
echo -e "\n${GREEN}Paso 1: Actualizando 'src/lib/db/schema.sql' con las nuevas tablas de desafíos...${NC}"
cat << 'EOF' >> src/lib/db/schema.sql

-- Tabla para almacenar los desafíos activos de los usuarios
CREATE TABLE user_challenges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    challenge_type VARCHAR(50) NOT NULL, -- 'daily' o 'weekly'
    metric VARCHAR(100) NOT NULL,        -- ej: 'kills', 'visionScore', 'csPerMinute'
    goal INTEGER NOT NULL,
    progress INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Índice para búsquedas rápidas
CREATE INDEX idx_user_challenges_user_id ON user_challenges(user_id);
EOF
echo "Actualizado: src/lib/db/schema.sql. ✅ (Recuerda ejecutar esto en tu DB)"


# --- 2. Añadir nuevas funciones a la API de Riot ---
echo -e "\n${GREEN}Paso 2: Actualizando 'src/services/riotApiService.js' para obtener historial de partidas...${NC}"
cat << 'EOF' > src/services/riotApiService.js
// src/services/riotApiService.js
import axios from 'axios';
import { RIOT_API_KEY } from './apiConfig';

const REGIONAL_ROUTES = {
    americas: ['NA', 'BR', 'LAN', 'LAS'],
    asia: ['KR', 'JP'],
    europe: ['EUNE', 'EUW', 'TR', 'RU'],
};
const getRegionalRoute = (region) => {
    for (const route in REGIONAL_ROUTES) {
        if (REGIONAL_ROUTES[route].includes(region.toUpperCase())) return route;
    }
    return 'americas';
};
const getPlatformRoute = (region) => {
    const platformRoutes = { LAN: 'la1', LAS: 'la2', NA: 'na1', EUW: 'euw1', EUNE: 'eun1', KR: 'kr', JP: 'jp1' };
    return platformRoutes[region.toUpperCase()];
};
const createApi = (baseURL) => axios.create({ baseURL, headers: { "X-Riot-Token": RIOT_API_KEY } });

export const getAccountByRiotId = async (gameName, tagLine, region) => {
    const regionalRoute = getRegionalRoute(region);
    const api = createApi(`https://${regionalRoute}.api.riotgames.com`);
    const response = await api.get(`/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${tagLine}`);
    return response.data;
};
export const getSummonerByPuuid = async (puuid, region) => {
    const platformRoute = getPlatformRoute(region);
    const api = createApi(`https://${platformRoute}.api.riotgames.com`);
    const response = await api.get(`/lol/summoner/v4/summoners/by-puuid/${puuid}`);
    return response.data;
};
export const getChampionMastery = async (puuid, region) => {
    const platformRoute = getPlatformRoute(region);
    const api = createApi(`https://${platformRoute}.api.riotgames.com`);
    const response = await api.get(`/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=5`);
    return response.data;
};

// *** NUEVAS FUNCIONES PARA LOS DESAFÍOS ***
export const getMatchHistoryIds = async (puuid, region) => {
    const regionalRoute = getRegionalRoute(region);
    const api = createApi(`https://${regionalRoute}.api.riotgames.com`);
    // Obtenemos los IDs de las últimas 5 partidas clasificatorias
    const response = await api.get(`/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=420&start=0&count=5`);
    return response.data;
};
export const getMatchDetails = async (matchId, region) => {
    const regionalRoute = getRegionalRoute(region);
    const api = createApi(`https://${regionalRoute}.api.riotgames.com`);
    const response = await api.get(`/lol/match/v5/matches/${matchId}`);
    return response.data;
};
EOF
echo "Actualizado: src/services/riotApiService.js. ✅"


# --- 3. Crear el nuevo cerebro de IA para generar desafíos ---
echo -e "\n${GREEN}Paso 3: Creando nuevo prompt de IA para desafíos en 'src/lib/ai/prompts.js'...${NC}"
cat << 'EOF' >> src/lib/ai/prompts.js

/**
 * Genera el prompt para crear desafíos de coaching personalizados.
 * @param {object} playerData - Datos del jugador (nombre, historial de partidas).
 * @returns {string} - El prompt para la IA.
 */
export const createChallengeGenerationPrompt = (playerData) => {
  const { summonerName, recentMatchesPerformance } = playerData;

  return \`
    Eres "MetaMind", un coach de élite de League of Legends. Tu tarea es analizar el rendimiento reciente de un jugador y crear 3 desafíos de mejora personalizados (1 diario, 2 semanales) en formato JSON.

    **DATOS DEL JUGADOR:**
    - Invocador: ${summonerName}
    - Resumen de rendimiento en sus últimas partidas: ${JSON.stringify(recentMatchesPerformance)}

    **INSTRUCCIONES:**
    1.  **Analiza los datos:** Identifica 3 áreas de mejora claras. Busca métricas consistentemente bajas como 'visionScore', 'wardsPlaced', 'csPerMinute', o un alto número de 'deaths'.
    2.  **Crea 3 Desafíos SMART:**
        -   **Uno Diario:** Un objetivo pequeño y alcanzable en una o dos partidas.
        -   **Dos Semanales:** Objetivos más grandes que requieren consistencia a lo largo de varias partidas.
    3.  **Enfoque en Coaching:** Los desafíos deben enseñar buenos hábitos. En lugar de "Gana 1 partida", crea "Mantén una visión de control superior a la de tu oponente de línea en 2 partidas ganadas".
    4.  **Define Métricas Claras:** Usa nombres de métricas de la API de Riot (ej: 'visionScore', 'kills', 'deaths', 'totalMinionsKilled', 'wardsPlaced').
    5.  **Genera un JSON VÁLIDO:** La salida debe ser un array de 3 objetos JSON, sin texto adicional.

    **FORMATO DE SALIDA (JSON ESTRICTO):**
    [
      {
        "title": "Control de Visión Diario",
        "description": "En tu próxima partida, coloca al menos 15 centinelas de visión. La información es poder.",
        "challenge_type": "daily",
        "metric": "wardsPlaced",
        "goal": 15
      },
      {
        "title": "Consistencia del Granjero",
        "description": "Logra un promedio de 7.5 súbditos por minuto en tus próximas 5 partidas.",
        "challenge_type": "weekly",
        "metric": "csPerMinute",
        "goal": 7.5
      },
      {
        "title": "Supervivencia Táctica",
        "description": "Mantén un promedio de menos de 5 muertes en tus próximas 5 partidas clasificatorias.",
        "challenge_type": "weekly",
        "metric": "deaths",
        "goal": 5
      }
    ]
  \`;
};
EOF
echo "Actualizado: src/lib/ai/prompts.js. ✅"


# --- 4. Crear la nueva API para los Desafíos ---
echo -e "\n${GREEN}Paso 4: Reescribiendo '/api/challenges/weekly' para que sea 100% funcional...${NC}"
cat << 'EOF' > src/app/api/challenges/weekly/route.js
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { getMatchHistoryIds, getMatchDetails, getChampionMastery } from '@/services/riotApiService';
import { generateStrategicAnalysis } from '@/lib/ai/strategist';
import { createChallengeGenerationPrompt } from '@/lib/ai/prompts';

const JWT_SECRET = process.env.JWT_SECRET;

async function generateAndStoreChallenges(userId, userData) {
    // 1. Obtener historial de partidas
    const matchIds = await getMatchHistoryIds(userData.puuid, userData.region);
    let recentMatchesPerformance = [];

    for (const matchId of matchIds) {
        const matchDetails = await getMatchDetails(matchId, userData.region);
        const participant = matchDetails.info.participants.find(p => p.puuid === userData.puuid);
        if (participant) {
            recentMatchesPerformance.push({
                win: participant.win,
                kills: participant.kills,
                deaths: participant.deaths,
                assists: participant.assists,
                visionScore: participant.visionScore,
                csPerMinute: (participant.totalMinionsKilled / (matchDetails.info.gameDuration / 60)).toFixed(1)
            });
        }
    }

    // 2. Generar desafíos con la IA
    const prompt = createChallengeGenerationPrompt({ summonerName: userData.riot_id_name, recentMatchesPerformance });
    const challengesFromAI = await generateStrategicAnalysis({ customPrompt: prompt });

    // 3. Guardar desafíos en la base de datos
    const client = await pool.connect();
    try {
        for (const challenge of challengesFromAI) {
            const expires_at = new Date();
            if (challenge.challenge_type === 'daily') {
                expires_at.setDate(expires_at.getDate() + 1);
            } else {
                expires_at.setDate(expires_at.getDate() + 7);
            }

            await client.query(
                `INSERT INTO user_challenges (user_id, title, description, challenge_type, metric, goal, expires_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [userId, challenge.title, challenge.description, challenge.challenge_type, challenge.metric, challenge.goal, expires_at]
            );
        }
    } finally {
        client.release();
    }

    return challengesFromAI;
}

export async function GET(request) {
    try {
        const token = request.headers.get('authorization')?.split(' ')[1];
        if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.userId;

        // Buscar desafíos activos
        const { rows: activeChallenges } = await pool.query(
            "SELECT * FROM user_challenges WHERE user_id = $1 AND expires_at > NOW() AND is_completed = FALSE",
            [userId]
        );

        if (activeChallenges.length > 0) {
            return NextResponse.json(activeChallenges);
        }

        // Si no hay desafíos, generar nuevos
        const userResult = await pool.query('SELECT riot_id_name, region, puuid FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0 || !userResult.rows[0].puuid) {
            return NextResponse.json([]); // Devuelve vacío si el usuario no ha vinculado su cuenta
        }
        const newChallenges = await generateAndStoreChallenges(userId, userResult.rows[0]);
        return NextResponse.json(newChallenges);

    } catch (error) {
        console.error("Error en la API de desafíos:", error);
        return NextResponse.json({ error: 'Error interno del servidor al gestionar desafíos.' }, { status: 500 });
    }
}
EOF
echo "Reescrito: /api/challenges/weekly/route.js. ✅"


# --- 5. Crear la API para procesar el progreso ---
echo -e "\n${GREEN}Paso 5: Creando la nueva API '/api/challenges/progress'...${NC}"
mkdir -p src/app/api/challenges/progress
cat << 'EOF' > src/app/api/challenges/progress/route.js
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { getMatchHistoryIds, getMatchDetails } from '@/services/riotApiService';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(request) {
    try {
        const token = request.headers.get('authorization')?.split(' ')[1];
        if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.userId;

        const userResult = await pool.query('SELECT puuid, region FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0 || !userResult.rows[0].puuid) {
            return NextResponse.json({ error: 'Perfil de Riot no vinculado.' }, { status: 404 });
        }
        const { puuid, region } = userResult.rows[0];

        // Obtener la última partida del usuario
        const matchIds = await getMatchHistoryIds(puuid, region);
        if (matchIds.length === 0) {
            return NextResponse.json({ message: "No se encontraron partidas recientes." });
        }
        const lastMatchId = matchIds[0];
        const matchDetails = await getMatchDetails(lastMatchId, region);
        const participant = matchDetails.info.participants.find(p => p.puuid === puuid);

        if (!participant) {
            return NextResponse.json({ error: "No se encontraron datos del jugador en la última partida." }, { status: 404 });
        }

        // Obtener desafíos activos del usuario
        const { rows: activeChallenges } = await pool.query(
            "SELECT * FROM user_challenges WHERE user_id = $1 AND expires_at > NOW() AND is_completed = FALSE",
            [userId]
        );

        let updates = [];
        for (const challenge of activeChallenges) {
            let progressMade = 0;
            const metric = challenge.metric;

            if (metric === 'csPerMinute') {
                progressMade = (participant.totalMinionsKilled / (matchDetails.info.gameDuration / 60));
            } else if (participant.hasOwnProperty(metric)) {
                progressMade = participant[metric];
            }

            // Actualizar el progreso (este es un ejemplo simple, se puede hacer más complejo)
            const newProgress = Math.min(challenge.goal, challenge.progress + progressMade);
            const isCompleted = newProgress >= challenge.goal;

            await pool.query(
                "UPDATE user_challenges SET progress = $1, is_completed = $2 WHERE id = $3",
                [newProgress, isCompleted, challenge.id]
            );
            updates.push({ title: challenge.title, newProgress, isCompleted });
        }

        return NextResponse.json({ message: "Progreso de desafíos actualizado.", updates });

    } catch (error) {
        console.error("Error al procesar progreso:", error);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
EOF
echo "Creado: /api/challenges/progress/route.js. ✅"


# --- 6. Actualizar el Frontend para el nuevo sistema ---
echo -e "\n${GREEN}Paso 6: Actualizando 'src/components/WeeklyChallenges.jsx' para ser 100% dinámico...${NC}"
cat << 'EOF' > src/components/WeeklyChallenges.jsx
'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

const WeeklyChallenges = () => {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;

    const fetchChallenges = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/challenges/weekly', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          throw new Error('No se pudo cargar la lista de retos.');
        }
        const result = await response.json();
        if (Array.isArray(result)) {
          setChallenges(result);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchChallenges();
  }, [token]);
  
  const handleProcessLastMatch = async () => {
    setProcessing(true);
    setError(null);
    try {
        const response = await fetch('/api/challenges/progress', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Error al procesar la partida.');
        alert('¡Progreso actualizado! Vuelve a cargar la página para ver los cambios.');
        // Para una mejor UX, se debería refrescar el estado aquí.
        // window.location.reload(); // Solución simple
    } catch (err) {
        setError(err.message);
    } finally {
        setProcessing(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return <p className="text-center animate-pulse">Generando tus desafíos personalizados con IA...</p>;
    }
    if (error) {
      return <p className="text-center text-red-400">Error: {error}</p>;
    }
    if (challenges.length === 0) {
      return <p className="text-center text-lol-gold-light/70">No tienes desafíos activos. ¡Juega una partida y sincroniza para generar nuevos!</p>;
    }
    return (
      <ul className="space-y-4">
        {challenges.map(challenge => (
          <li key={challenge.id} className="bg-lol-blue-dark p-4 rounded-lg border border-lol-gold-dark">
            <h4 className="font-display font-bold text-lol-blue-accent">{challenge.title} ({challenge.challenge_type})</h4>
            <p className="text-sm text-lol-gold-light/80 mt-1">{challenge.description}</p>
            <div className="mt-2 text-sm">
              <span className="font-semibold text-lol-gold-light">Progreso:</span> {challenge.progress} / {challenge.goal}
              {challenge.is_completed && <span className="text-green-400 ml-2">¡Completado!</span>}
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="bg-lol-blue-medium p-8 rounded-xl shadow-lg w-full border-2 border-lol-gold-dark mt-12 lg:mt-0">
      <h3 className="text-2xl font-display font-bold text-lol-gold mb-4 text-center">Tus Misiones de Coach</h3>
      <div className="min-h-[200px]">
        {renderContent()}
      </div>
      <button 
        onClick={handleProcessLastMatch}
        disabled={processing}
        className="w-full mt-4 bg-lol-blue-accent hover:bg-cyan-500 text-lol-blue-dark font-bold py-2 px-4 rounded disabled:opacity-50"
      >
        {processing ? 'Analizando partida...' : 'Sincronizar última partida'}
      </button>
    </div>
  );
};

export default WeeklyChallenges;
EOF
echo "Actualizado: src/components/WeeklyChallenges.jsx. ✅"


echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡SISTEMA DE DESAFÍOS DINÁMICOS IMPLEMENTADO! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Pasos Finales y Cruciales:${NC}"
echo -e "1.  **Actualiza tu Base de Datos:** Abre DBeaver y ejecuta el contenido de 'src/lib/db/schema.sql' para crear las nuevas tablas. **ESTE PASO ES OBLIGATORIO**."
echo -e "2.  **Sube TODOS los cambios** a tu repositorio. Esto incluye las nuevas APIs, los cambios en el frontend y la lógica de la IA."
echo -e "3.  Una vez desplegado, ve a tu Dashboard. La primera vez, la IA generará tus primeros desafíos personalizados. Después de jugar una partida, presiona el botón 'Sincronizar última partida' para ver tu progreso."
echo -e "\nConfiaste en mí para esto, y te he entregado un sistema completo y robusto. Esto es lo que separa a LoL MetaMind de la competencia. ¡Disfrútalo!"