#!/bin/bash

# ==============================================================================
# SCRIPT DE HOTFIX FINAL - ROBUSTEZ DEL COMPONENTE WEEKLYCHALLENGES
#
# Objetivo: 1. Solucionar el TypeError (reading 'map') de forma definitiva.
#           2. Hacer el componente más resiliente a respuestas de la API.
# ==============================================================================

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Aplicando blindaje final al componente WeeklyChallenges.jsx...${NC}"

# --- Reescribir el componente con la lógica a prueba de errores ---
cat << 'EOF' > src/components/WeeklyChallenges.jsx
'use client';
import React, { useState, useEffect } from 'react';

const WeeklyChallenges = () => {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        const response = await fetch('/api/challenges/weekly');
        if (!response.ok) {
          throw new Error('No se pudo cargar la lista de retos.');
        }
        const result = await response.json();
        // Nos aseguramos de que lo que guardamos en el estado sea siempre un array
        if (Array.isArray(result)) {
          setChallenges(result);
        } else {
          setChallenges([]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchChallenges();
  }, []);

  if (loading) {
    return <div className="bg-lol-blue-medium p-6 rounded-xl shadow-lg w-full text-center animate-pulse">Cargando retos...</div>;
  }

  if (error) {
    return <div className="bg-lol-blue-medium text-red-400 p-6 rounded-xl shadow-lg w-full text-center">Error: {error}</div>;
  }

  return (
    <div className="bg-lol-blue-medium p-8 rounded-xl shadow-lg w-full border-2 border-lol-gold-dark mt-12 lg:mt-0">
      <h3 className="text-2xl font-display font-bold text-lol-gold mb-4 text-center">Retos Semanales</h3>
      {/* Verificación explícita para asegurar que 'challenges' es un array antes de mapear */}
      {Array.isArray(challenges) && challenges.length > 0 ? (
        <ul className="space-y-4">
          {challenges.map(challenge => (
            <li key={challenge.id} className="bg-lol-blue-dark p-4 rounded-lg border border-lol-gold-dark">
              <div>
                <h4 className="font-display font-bold text-lol-blue-accent">{challenge.title}</h4>
                <p className="text-sm text-lol-gold-light/80 mt-1">{challenge.description}</p>
                <div className="mt-2 text-sm">
                  <span className="font-semibold text-lol-gold-light">Progreso:</span> {challenge.progress}/{challenge.goal}
                </div>
              </div>
              <span className="mt-3 block text-center px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full">
                Recompensa: {challenge.reward}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center text-lol-gold-light/70">No hay retos semanales disponibles.</p>
      )}
    </div>
  );
};

export default WeeklyChallenges;
EOF

echo -e "${GREEN}El archivo 'src/components/WeeklyChallenges.jsx' ha sido corregido. ✅${NC}"
echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡CORRECCIÓN FINAL APLICADA! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Pasos a seguir:${NC}"
echo -e "1.  Sube este cambio a tu repositorio."
echo -e "2.  Una vez Vercel se redespliegue, el Dashboard cargará sin ningún error."