#!/bin/bash

# ==============================================================================
# SCRIPT DE HOTFIX FINAL - SINCRONIZACIÓN DE UI CON IA AVANZADA
#
# Objetivo: 1. Actualizar el componente ProfileForm.jsx para que pueda renderizar
#              la nueva y más compleja estructura de datos del análisis de la IA.
#           2. Solucionar el error 'TypeError: Cannot read properties of
#              undefined (reading 'map')' de forma definitiva.
# ==============================================================================

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Sincronizando el frontend con la nueva IA avanzada...${NC}"

# --- Reescribir el ProfileForm para que muestre el análisis completo ---
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

  // *** NUEVA SECCIÓN DE RESULTADOS MEJORADA ***
  if (status === 'success' && recommendation) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-lol-blue-medium text-lol-gold-light p-8 rounded-xl shadow-lg w-full border-2 border-lol-gold-dark"
      >
        <h2 className="text-3xl font-display font-bold text-lol-blue-accent mb-6 text-center">Plan de Acción para {currentUser.riot_id_name}</h2>
        
        <div className="space-y-6">
          {/* Módulo de Análisis de Estilo de Juego */}
          {recommendation.playstyleAnalysis && (
            <div className="bg-lol-blue-dark p-4 rounded-lg border border-lol-gold-dark">
              <h3 className="text-xl font-display font-bold text-lol-gold mb-2">{recommendation.playstyleAnalysis.title}</h3>
              <p><strong className="font-semibold text-lol-gold-light">Arquetipo:</strong> <span className="text-lol-blue-accent font-bold">{recommendation.playstyleAnalysis.style}</span></p>
              <p className="text-sm text-lol-gold-light/80 mt-1">{recommendation.playstyleAnalysis.description}</p>
            </div>
          )}

          {/* Módulo de Sinergia Astro-Táctica */}
          {recommendation.astroTacticSynergy && (
            <div className="bg-lol-blue-dark p-4 rounded-lg border border-lol-gold-dark">
              <h3 className="text-xl font-display font-bold text-lol-gold mb-2">{recommendation.astroTacticSynergy.title}</h3>
              <p className="text-sm text-lol-gold-light/80">{recommendation.astroTacticSynergy.description}</p>
            </div>
          )}

          {/* Módulo de Coaching de Maestría */}
          {recommendation.masteryCoaching && Array.isArray(recommendation.masteryCoaching.tips) && (
            <div className="bg-lol-blue-dark p-4 rounded-lg border border-lol-gold-dark">
              <h3 className="text-xl font-display font-bold text-lol-gold mb-2">{recommendation.masteryCoaching.title}</h3>
              <ul className="list-disc list-inside space-y-2 text-lol-gold-light/80 text-sm">
                {recommendation.masteryCoaching.tips.map((tip, index) => (
                  <li key={index}><strong>Campeón ID {tip.championId}:</strong> {tip.advice}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Módulo de Nuevas Recomendaciones */}
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

echo -e "${GREEN}El archivo 'src/components/forms/ProfileForm.jsx' ha sido corregido y mejorado. ✅${NC}"
echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡SINCRONIZACIÓN COMPLETA! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Pasos Finales:${NC}"
echo -e "1.  Sube este cambio a tu repositorio."
echo -e "2.  Una vez Vercel se redespliegue, el error desaparecerá y verás el nuevo y detallado análisis de la IA."