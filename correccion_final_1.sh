#!/bin/bash

# ==============================================================================
# SCRIPT DE CORRECCIÓN INTEGRAL - VALIDACIÓN DE RIOT ID
#
# Objetivo: 1. Corregir el formulario de frontend para eliminar la búsqueda
#              en tiempo real y mejorar la gestión de errores.
#           2. Limpiar el backend de código no funcional (búsqueda simulada).
#           3. Asegurar que el flujo de vinculación sea robusto y directo.
# ==============================================================================

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Iniciando la corrección integral del flujo de Riot ID...${NC}"

# --- 1. Reemplazar el formulario del frontend ---
echo -e "\n${GREEN}Paso 1: Actualizando 'src/components/forms/SummonerProfileForm.jsx'...${NC}"
cat << 'EOF' > src/components/forms/SummonerProfileForm.jsx
'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

export default function SummonerProfileForm({ onProfileUpdate }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [apiError, setApiError] = useState('');
  const regions = ['LAS', 'LAN', 'NA', 'EUW', 'EUNE', 'KR', 'JP'];

  const onSubmit = async (data) => {
    setApiError('');
    try {
      // Limpia el tagline si el usuario incluye el #
      const cleanTagLine = data.tagLine.startsWith('#') ? data.tagLine.substring(1) : data.tagLine;

      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ ...data, tagLine: cleanTagLine }),
      });

      const result = await response.json();
      if (!response.ok) {
        // Usamos el mensaje de error específico de la API si está disponible
        throw new Error(result.error || 'No se pudo actualizar el perfil.');
      }
      
      alert('¡Perfil de invocador vinculado con éxito!');
      if(onProfileUpdate) onProfileUpdate(result.user);

    } catch (err) {
      console.error("Error en el envío del formulario:", err);
      setApiError(err.message);
    }
  };

  return (
    <div className="bg-lol-blue-medium text-lol-gold-light p-8 rounded-xl shadow-lg w-full border-2 border-lol-gold-dark">
      <h2 className="text-2xl font-display font-bold text-lol-blue-accent mb-2">Vincula tu Riot ID</h2>
      <p className="text-lol-gold-light/90 mb-6">
        Ingresa tu nombre de juego y tu tagline para activar el coaching. Lo encontrarás pasando el mouse sobre tu avatar en el cliente de Riot.
      </p>
      {apiError && <p className="bg-red-900/50 text-red-300 border border-red-500 rounded-md p-3 text-center mb-4">{apiError}</p>}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow">
            <label htmlFor="gameName" className="block text-sm font-medium mb-2">Nombre de Juego</label>
            <input
              id="gameName"
              placeholder="Ej: Faker"
              {...register("gameName", { required: "El nombre es requerido." })}
              className="w-full bg-lol-blue-dark border-2 border-lol-gold-dark rounded-lg px-4 py-2"
            />
            {errors.gameName && <p className="text-red-500 text-xs mt-1">{errors.gameName.message}</p>}
          </div>
          <div className="w-full md:w-1/3">
            <label htmlFor="tagLine" className="block text-sm font-medium mb-2">Tagline</label>
            <input
              id="tagLine"
              placeholder="KR1"
              {...register("tagLine", { required: "El tagline es requerido." })}
              className="w-full bg-lol-blue-dark border-2 border-lol-gold-dark rounded-lg px-4 py-2"
            />
            {errors.tagLine && <p className="text-red-500 text-xs mt-1">{errors.tagLine.message}</p>}
          </div>
        </div>
        <div>
          <label htmlFor="region" className="block text-sm font-medium mb-2">Región de Juego</label>
          <select
            id="region"
            {...register("region", { required: "Debes seleccionar una región." })}
            className="w-full bg-lol-blue-dark border-2 border-lol-gold-dark rounded-lg px-4 py-2"
          >
            {regions.map(region => <option key={region} value={region}>{region}</option>)}
          </select>
          {errors.region && <p className="text-red-500 text-xs mt-1">{errors.region.message}</p>}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-lol-gold hover:bg-lol-gold-dark text-lol-blue-dark font-display font-bold py-3 px-4 rounded-lg disabled:opacity-50"
        >
          {isSubmitting ? 'Verificando y Guardando...' : 'Vincular y Guardar'}
        </button>
      </form>
    </div>
  );
}
EOF
echo -e "${GREEN}Formulario del frontend corregido. ✅${NC}"


# --- 2. Eliminar la API de búsqueda innecesaria ---
echo -e "\n${GREEN}Paso 2: Eliminando la ruta de API de búsqueda...${NC}"
rm -f src/app/api/riot/search/route.js
echo -e "${GREEN}Archivo 'src/app/api/riot/search/route.js' eliminado. ✅${NC}"


# --- 3. Limpiar el servicio de la API de Riot ---
echo -e "\n${GREEN}Paso 3: Limpiando 'src/services/riotApiService.js'...${NC}"
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
        if (REGIONAL_ROUTES[route].includes(region.toUpperCase())) {
            return route;
        }
    }
    // Si no se encuentra, por defecto usamos 'americas' que cubre LAN/LAS/NA
    return 'americas';
};

const getPlatformRoute = (region) => {
    const platformRoutes = { LAN: 'la1', LAS: 'la2', NA: 'na1', EUW: 'euw1', EUNE: 'eun1', KR: 'kr', JP: 'jp1' };
    return platformRoutes[region.toUpperCase()];
};

const createApi = (baseURL) => axios.create({
    baseURL,
    headers: { "X-Riot-Token": RIOT_API_KEY }
});

export const getAccountByRiotId = async (gameName, tagLine, region) => {
    const regionalRoute = getRegionalRoute(region);
    const api = createApi(`https://${regionalRoute}.api.riotgames.com`);
    try {
        const response = await api.get(`/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${tagLine}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching account by Riot ID:', error.response?.data || error.message);
        throw error;
    }
};

export const getSummonerByPuuid = async (puuid, region) => {
    const platformRoute = getPlatformRoute(region);
    const api = createApi(`https://${platformRoute}.api.riotgames.com`);
    try {
        const response = await api.get(`/lol/summoner/v4/summoners/by-puuid/${puuid}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching summoner by PUUID:', error.response?.data || error.message);
        throw error;
    }
};

export const getLiveGameBySummonerId = async (summonerId, region) => {
    const platformRoute = getPlatformRoute(region);
    const api = createApi(`https://${platformRoute}.api.riotgames.com`);
    try {
        const response = await api.get(`/lol/spectator/v4/active-games/by-summoner/${summonerId}`);
        return response.data;
    } catch (error) {
        if (error.response?.status === 404) return null;
        console.error('Error fetching live game data:', error.response?.data || error.message);
        throw error;
    }
};
EOF
echo -e "${GREEN}Servicio de API de Riot limpiado. ✅${NC}"

echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡CORRECCIÓN APLICADA! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Pasos a seguir:${NC}"
echo -e "1.  Asegúrate de que tu nueva API Key esté guardada en Vercel."
echo -e "2.  Haz 'commit' y 'push' de los cambios a tu repositorio. Vercel se redesplegará automáticamente."
echo -e "3.  Una vez desplegado, el formulario debería funcionar correctamente sin errores."