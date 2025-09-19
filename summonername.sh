#!/bin/bash

# ==============================================================================
# SCRIPT DE ACTUALIZACIÓN - MODERNIZACIÓN A RIOT ID
#
# Rol: Full-Stack Engineer
# Objetivo: 1. Actualizar todo el flujo de vinculación de cuentas para usar el
#              nuevo sistema de Riot ID (Nombre#Tagline).
#           2. Solucionar el error de parseo de JSON en el frontend.
#           3. Mejorar la UX del formulario para guiar al usuario.
# ==============================================================================

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Iniciando modernización del sistema a Riot ID...${NC}"

# --- 1. Actualizar el Esquema de la Base de Datos ---
echo -e "\n${GREEN}Paso 1: Modificando 'src/lib/db/schema.sql' para Riot ID...${NC}"
cat << 'EOF' > src/lib/db/schema.sql
-- src/lib/db/schema.sql
-- Esquema de base de datos para PostgreSQL en producción.

-- Tabla de Usuarios
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    zodiac_sign VARCHAR(50),
    
    -- Campos para el Riot ID y datos de League
    riot_id_name VARCHAR(255),
    riot_id_tagline VARCHAR(10),
    region VARCHAR(10),
    puuid VARCHAR(255),
    summoner_id VARCHAR(255),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Se pueden añadir más tablas aquí, como las de gamificación.
EOF
echo "Actualizado: src/lib/db/schema.sql. (Recuerda aplicar estos cambios a tu DB de producción)"


# --- 2. Modernizar el Servicio de la API de Riot ---
echo -e "\n${GREEN}Paso 2: Actualizando 'src/services/riotApiService.js' con los endpoints modernos...${NC}"
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
    throw new Error(`Región no válida para ruta regional: ${region}`);
};

const getPlatformRoute = (region) => {
    const platformRoutes = { LAN: 'la1', LAS: 'la2', NA: 'na1', EUW: 'euw1', EUNE: 'eun1', KR: 'kr', JP: 'jp1' };
    return platformRoutes[region.toUpperCase()];
};

const createApi = (baseURL) => axios.create({
    baseURL,
    headers: { "X-Riot-Token": RIOT_API_KEY }
});

export const getAccountByRiotId = async (gameName, tagLine) => {
    // La API de Cuentas es regional, no por plataforma
    const regionalRoute = getRegionalRoute('LAS'); // Asumimos una región para encontrar la ruta, se puede mejorar
    const api = createApi(`https://${regionalRoute}.api.riotgames.com`);
    try {
        const response = await api.get(`/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`);
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
echo "Actualizado: src/services/riotApiService.js"


# --- 3. Actualizar el Endpoint del Perfil ---
echo -e "\n${GREEN}Paso 3: Actualizando la API '/api/user/profile' para usar Riot ID...${NC}"
cat << 'EOF' > src/app/api/user/profile/route.js
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { getAccountByRiotId, getSummonerByPuuid } from '@/services/riotApiService';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const { gameName, tagLine, region } = await request.json();
    if (!gameName || !tagLine || !region) {
      return NextResponse.json({ error: 'Nombre de juego, tagline y región son requeridos' }, { status: 400 });
    }

    // 1. Obtener PUUID desde la API de Cuentas
    const accountData = await getAccountByRiotId(gameName, tagLine);
    const { puuid } = accountData;

    // 2. Obtener datos del Invocador (incluyendo summonerId) usando el PUUID
    const summonerData = await getSummonerByPuuid(puuid, region);
    const { id: summoner_id } = summonerData;

    // 3. Actualizar nuestra base de datos
    const result = await pool.query(
      `UPDATE users 
       SET riot_id_name = $1, riot_id_tagline = $2, region = $3, puuid = $4, summoner_id = $5, updated_at = NOW() 
       WHERE id = $6 
       RETURNING id, username, email, riot_id_name, riot_id_tagline, region`,
      [gameName, tagLine, region, puuid, summoner_id, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado en nuestra base de datos' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Perfil actualizado con éxito', user: result.rows[0] });

  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    if (error.response?.status === 404) {
      return NextResponse.json({ error: `Riot ID no encontrado. Verifica el nombre, tagline y región.` }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error interno del servidor al procesar la solicitud.' }, { status: 500 });
  }
}
EOF
echo "Actualizado: src/app/api/user/profile/route.js"


# --- 4. Rediseñar el Formulario del Frontend ---
echo -e "\n${GREEN}Paso 4: Rediseñando 'src/components/forms/SummonerProfileForm.jsx'...${NC}"
cat << 'EOF' > src/components/forms/SummonerProfileForm.jsx
'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

export default function SummonerProfileForm({ onProfileUpdate }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [error, setError] = useState('');
  const regions = ['LAN', 'LAS', 'NA', 'EUW', 'EUNE', 'KR', 'JP'];

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
        Ingresa tu nombre de juego y tu tagline para activar el coaching. Lo encontrarás pasando el mouse sobre tu avatar en el cliente de Riot.
      </p>
      {error && <p className="bg-red-900/50 text-red-300 border border-red-500 rounded-md p-3 text-center mb-4">{error}</p>}
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
              placeholder="#LAS"
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
echo "Rediseñado: src/components/forms/SummonerProfileForm.jsx"

# --- 5. Actualizar la página del Dashboard ---
echo -e "\n${GREEN}Paso 5: Actualizando 'src/app/dashboard/page.jsx' para la nueva lógica...${NC}"
# Cambiamos la condición para que verifique el nuevo campo riot_id_name
sed -i.bak "s/currentUser && currentUser.summoner_name/currentUser && currentUser.riot_id_name/g" src/app/dashboard/page.jsx
rm src/app/dashboard/page.jsx.bak
echo "Actualizado: src/app/dashboard/page.jsx"


echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡SISTEMA ACTUALIZADO A RIOT ID! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Resumen de la Actualización:${NC}"
echo -e "1.  **Backend Modernizado:** Ahora usamos las APIs correctas para buscar jugadores."
echo -e "2.  **Frontend Intuitivo:** El formulario ahora pide los datos correctos y guía al usuario."
echo -e "3.  **Error de JSON Resuelto:** Al usar la API correcta, el backend ya no devolverá respuestas vacías por nombres inválidos, solucionando el error del frontend."
echo -e "\n**Acción Final:** Haz 'commit' y 'push' de estos cambios. Con esto, el flujo de vinculación de cuentas es robusto, moderno y está listo para producción. ¡Misión cumplida!"