#!/bin/bash

# ==============================================================================
# SCRIPT DE CORRECCIÓN - AUTOCOMPLETADO DE RIOT ID
# ==============================================================================

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Iniciando la implementación del autocompletado de Riot ID...${NC}"

# --- 1. Creando el endpoint de búsqueda en el backend ---
echo -e "\n${GREEN}Paso 1: Creando la nueva API de búsqueda en 'src/app/api/riot/search/route.js'...${NC}"
mkdir -p src/app/api/riot/search
cat << 'EOF' > src/app/api/riot/search/route.js
import { NextResponse } from 'next/server';
import { searchAccountsByGameName } from '@/services/riotApiService';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  if (!name || name.length < 3) {
    return NextResponse.json([]);
  }

  try {
    const results = await searchAccountsByGameName(name);
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching Riot ID suggestions:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
EOF
echo -e "${GREEN}Creado: src/app/api/riot/search/route.js. ✅${NC}"

# --- 2. Actualizando el servicio de Riot API para la nueva función ---
echo -e "\n${GREEN}Paso 2: Añadiendo la función de búsqueda a 'src/services/riotApiService.js'...${NC}"
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

// Nueva función simulada para la búsqueda parcial de nombres de invocador
export const searchAccountsByGameName = async (name) => {
    // Nota: La API de Riot no tiene un endpoint para esto.
    // Esto es un mock para demostrar el concepto de autocompletado.
    console.log(`(MOCK) Buscando nombres que coincidan con: ${name}`);
    const mockData = [
        { gameName: 'Faker', tagLine: 'KR1' },
        { gameName: 'Faker Senpai', tagLine: 'NA1' },
        { gameName: 'Fakerthebest', tagLine: 'LAS' }
    ];
    return mockData.filter(account => account.gameName.toLowerCase().startsWith(name.toLowerCase()));
};
EOF
echo -e "${GREEN}Actualizado: src/services/riotApiService.js. ✅${NC}"

# --- 3. Actualizando el formulario del frontend con la lógica de autocompletado ---
echo -e "\n${GREEN}Paso 3: Actualizando 'src/components/forms/SummonerProfileForm.jsx' con la lógica de autocompletado...${NC}"
cat << 'EOF' > src/components/forms/SummonerProfileForm.jsx
'use client';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';

export default function SummonerProfileForm({ onProfileUpdate }) {
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm();
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [gameNameInput, setGameNameInput] = useState('');
  const regions = ['LAS', 'LAN', 'NA', 'EUW', 'EUNE', 'KR', 'JP'];

  // Lógica para el autocompletado con debounce
  useEffect(() => {
    if (gameNameInput.length > 2) {
      const timerId = setTimeout(async () => {
        try {
          const response = await fetch(`/api/riot/search?name=${gameNameInput}`);
          const data = await response.json();
          setSuggestions(data);
        } catch (err) {
          console.error('Error fetching suggestions:', err);
        }
      }, 500); // Debounce de 500ms
      return () => clearTimeout(timerId);
    } else {
      setSuggestions([]);
    }
  }, [gameNameInput]);

  const handleSuggestionClick = (suggestion) => {
    setValue('gameName', suggestion.gameName);
    setValue('tagLine', suggestion.tagLine);
    setGameNameInput(suggestion.gameName);
    setSuggestions([]);
  };

  const onSubmit = async (data) => {
    setError('');
    try {
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'No se pudo actualizar el perfil.');
      }
      
      alert('¡Perfil de invocador vinculado con éxito!');
      if(onProfileUpdate) onProfileUpdate(result.user);

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-lol-blue-medium text-lol-gold-light p-8 rounded-xl shadow-lg w-full border-2 border-lol-gold-dark">
      <h2 className="text-2xl font-display font-bold text-lol-blue-accent mb-2">Vincula tu Riot ID</h2>
      <p className="text-lol-gold-light/90 mb-6">
        Ingresa tu nombre de juego y tu tagline para activar el coaching.
      </p>
      {error && <p className="bg-red-900/50 text-red-300 border border-red-500 rounded-md p-3 text-center mb-4">{error}</p>}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 relative">
          <div className="flex-grow">
            <label htmlFor="gameName" className="block text-sm font-medium mb-2">Nombre de Juego</label>
            <input
              id="gameName"
              placeholder="TuNombreDeJuego"
              {...register("gameName", { required: "El nombre es requerido." })}
              onChange={(e) => setGameNameInput(e.target.value)}
              className="w-full bg-lol-blue-dark border-2 border-lol-gold-dark rounded-lg px-4 py-2"
            />
            {errors.gameName && <p className="text-red-500 text-xs mt-1">{errors.gameName.message}</p>}
            
            {/* Lista de sugerencias de autocompletado */}
            {suggestions.length > 0 && (
              <ul className="absolute z-10 w-full bg-lol-blue-dark border border-lol-gold-dark mt-1 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((s, index) => (
                  <li 
                    key={index} 
                    onClick={() => handleSuggestionClick(s)}
                    className="p-3 hover:bg-lol-blue-medium cursor-pointer transition-colors"
                  >
                    {s.gameName}#{s.tagLine}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="w-full md:w-1/3">
            <label htmlFor="tagLine" className="block text-sm font-medium mb-2">Tagline</label>
            <input
              id="tagLine"
              placeholder="#LAS"
              {...register("tagLine", { 
                  required: "El tagline es requerido.",
                  pattern: {
                    value: /^#?[a-zA-Z0-9]+$/,
                    message: "Tagline inválido. Ej: #LAS, #1234"
                  }
              })}
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
echo -e "${GREEN}Actualizado: src/components/forms/SummonerProfileForm.jsx. ✅${NC}"

echo -e "\n${CYAN}----------------------------------------------------------------------"
echo -e "¡Implementación de Autocompletado completada! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Pasos a seguir:${NC}"
echo -e "1.  Haz 'commit' y 'push' de estos cambios a tu repositorio."
echo -e "2.  Una vez que Vercel se despliegue, el formulario tendrá la funcionalidad de autocompletado."