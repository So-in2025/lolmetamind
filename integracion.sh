#!/bin/bash

# ==============================================================================
# SCRIPT DE ACTUALIZACIÓN - FASE 3 (Parte 2): VINCULACIÓN DE CUENTA Y LIVE GAME
#
# Rol: Full-Stack Developer
# Objetivo: 1. Permitir a los usuarios guardar su Summoner Name en su perfil.
#           2. Implementar la llamada a la Live Game API de Riot para obtener
#              datos de partidas en tiempo real.
# ==============================================================================

# --- Colores para la salida ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Iniciando la implementación de la vinculación de cuenta y Live Game API...${NC}"

# --- 1. Actualizar el Esquema de la Base de Datos ---
echo -e "\n${GREEN}Paso 1: Modificando 'src/lib/db/schema.sql' para añadir campos de invocador...${NC}"
# Usamos awk para añadir las nuevas columnas sin borrar el contenido existente
awk '/summoner_name VARCHAR/ {
    print;
    print "    region VARCHAR(10),";
    print "    summoner_id VARCHAR(255),";
    print "    puuid VARCHAR(255),";
    next;
} 1' src/lib/db/schema.sql > tmp.sql && mv tmp.sql src/lib/db/schema.sql
sed -i.bak 's/summoner_name VARCHAR(255),/summoner_name VARCHAR(255),/' src/lib/db/schema.sql # Limpieza por si acaso
rm src/lib/db/schema.sql.bak
echo "Actualizado: src/lib/db/schema.sql. (Recuerda aplicar estos cambios a tu DB de producción)"

# --- 2. Implementar las funciones de la API de Riot ---
echo -e "\n${GREEN}Paso 2: Añadiendo la función getLiveGame a 'src/services/riotApiService.js'...${NC}"
cat << 'EOF' > src/services/riotApiService.js
// src/services/riotApiService.js
import axios from 'axios';
import { RIOT_API_KEY } from './apiConfig';

// Mapeo de regiones de la app a las plataformas de la API de Riot
const regionToPlatformMap = {
  LAN: 'la1',
  LAS: 'la2',
  NA: 'na1',
  EUW: 'euw1',
  EUNE: 'eun1',
  KR: 'kr',
  JP: 'jp1',
  // Agrega otras regiones según sea necesario
};

const getRiotApi = (region) => {
  const platformId = regionToPlatformMap[region.toUpperCase()];
  if (!platformId) {
    throw new Error(`Región no válida: ${region}`);
  }
  
  const baseURL = `https://${platformId}.api.riotgames.com`;
  
  return axios.create({
    baseURL,
    headers: {
      "X-Riot-Token": RIOT_API_KEY
    }
  });
};

/**
 * Obtiene los datos de un invocador por su nombre y región.
 * @param {string} summonerName - El nombre del invocador.
 * @param {string} region - La región del invocador (ej: 'LAS', 'NA').
 * @returns {Promise<object>} - Los datos del invocador.
 */
export const getSummonerByName = async (summonerName, region) => {
  try {
    const riotApi = getRiotApi(region);
    const response = await riotApi.get(`/lol/summoner/v4/summoners/by-name/${summonerName}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching summoner data:', error.response ? error.response.data : error.message);
    throw error;
  }
};

/**
 * Obtiene la partida en vivo de un invocador por su ID.
 * @param {string} summonerId - El ID encriptado del invocador.
 * @param {string} region - La región del invocador.
 * @returns {Promise<object>} - Los datos de la partida en vivo.
 */
export const getLiveGameBySummonerId = async (summonerId, region) => {
  try {
    const riotApi = getRiotApi(region);
    const response = await riotApi.get(`/lol/spectator/v4/active-games/by-summoner/${summonerId}`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null; // Es normal no encontrar partida, no lo tratamos como un error fatal.
    }
    console.error('Error fetching live game data:', error.response ? error.response.data : error.message);
    throw error;
  }
};
EOF
echo "Actualizado: src/services/riotApiService.js"

# --- 3. Crear el componente de formulario para el perfil de invocador ---
echo -e "\n${GREEN}Paso 3: Creando el nuevo componente 'src/components/forms/SummonerProfileForm.jsx'...${NC}"
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
          'Authorization': `Bearer ${localStorage.getItem('authToken')}` // Enviamos el token
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'No se pudo actualizar el perfil.');
      }
      
      alert('¡Perfil actualizado con éxito!');
      if(onProfileUpdate) onProfileUpdate(result.user);

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-lol-blue-medium text-lol-gold-light p-8 rounded-xl shadow-lg w-full border-2 border-lol-gold-dark">
      <h2 className="text-2xl font-display font-bold text-lol-blue-accent mb-1">Vincula tu Invocador</h2>
      <p className="text-lol-gold-light/90 mb-6">Ingresa tu nombre de invocador y región para activar el coaching.</p>
      {error && <p className="text-red-500 text-center mb-4">{error}</p>}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="summonerName" className="block text-sm font-medium mb-2">Summoner Name</label>
          <input
            id="summonerName"
            {...register("summonerName", { required: "El nombre de invocador es requerido." })}
            className="w-full bg-lol-blue-dark border-2 border-lol-gold-dark rounded-lg px-4 py-2"
          />
          {errors.summonerName && <p className="text-red-500 text-xs mt-1">{errors.summonerName.message}</p>}
        </div>
        <div>
          <label htmlFor="region" className="block text-sm font-medium mb-2">Región</label>
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
          {isSubmitting ? 'Guardando...' : 'Guardar Perfil'}
        </button>
      </form>
    </div>
  );
}
EOF
echo "Creado: src/components/forms/SummonerProfileForm.jsx"

# --- 4. Modificar el Dashboard para usar el nuevo formulario ---
echo -e "\n${GREEN}Paso 4: Actualizando 'src/app/dashboard/page.jsx' para mostrar el formulario correcto...${NC}"
cat << 'EOF' > src/app/dashboard/page.jsx
'use client';
import { useAuth } from '@/context/AuthContext';
import SummonerProfileForm from '@/components/forms/SummonerProfileForm';
import ProfileForm from '@/components/forms/ProfileForm';
import WeeklyChallenges from '@/components/WeeklyChallenges';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const { user, login } = useAuth();
  // Estado local para forzar re-renderizado cuando el perfil se actualiza
  const [currentUser, setCurrentUser] = useState(user);

  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  const handleProfileUpdate = (updatedUser) => {
    // Actualizamos el estado local y también el AuthContext global
    setCurrentUser(updatedUser);
    const token = localStorage.getItem('authToken');
    login(updatedUser, token);
  };

  const hasSummonerProfile = currentUser && currentUser.summoner_name;

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-12">
      <div className="w-full lg:w-2/3 flex flex-col items-center">
        {hasSummonerProfile ? (
          <>
            <div className="w-full max-w-lg mb-8 text-center lg:text-left">
              <h2 className="text-4xl md:text-5xl font-display font-bold text-lol-blue-accent mb-4">
                Tu Centro de Mando
              </h2>
              <p className="text-lg text-lol-gold-light/90">
                Usa el formulario para obtener un análisis instantáneo o revisa tus retos semanales.
              </p>
            </div>
            <div className="w-full max-w-lg">
              <ProfileForm />
            </div>
          </>
        ) : (
          <div className="w-full max-w-lg">
            <SummonerProfileForm onProfileUpdate={handleProfileUpdate} />
          </div>
        )}
      </div>
      <div className="w-full lg:w-1/3 flex flex-col items-center mt-0 lg:mt-12">
        <div className="w-full max-w-lg">
          <WeeklyChallenges />
          <div className="mt-8 text-center bg-lol-blue-medium p-6 rounded-xl shadow-lg border-2 border-lol-gold-dark">
            <h3 className="text-xl font-display font-bold text-lol-gold mb-2">Para Streamers</h3>
            <Link href="/overlay" className="text-lol-blue-accent hover:text-lol-gold" target="_blank">
              Abrir el widget de OBS »
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
EOF
echo "Actualizado: src/app/dashboard/page.jsx"

# --- 5. Crear la API para actualizar el perfil del usuario ---
echo -e "\n${GREEN}Paso 5: Creando la API en 'src/app/api/user/profile/route.js'...${NC}"
mkdir -p src/app/api/user
cat << 'EOF' > src/app/api/user/profile/route.js
// src/app/api/user/profile/route.js
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { getSummonerByName } from '@/services/riotApiService';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const { summonerName, region } = await request.json();
    if (!summonerName || !region) {
      return NextResponse.json({ error: 'Nombre de invocador y región son requeridos' }, { status: 400 });
    }

    // 1. Obtener datos de la API de Riot
    const summonerData = await getSummonerByName(summonerName, region);
    const { id: summoner_id, puuid, name } = summonerData;

    // 2. Actualizar nuestra base de datos
    const result = await pool.query(
      `UPDATE users 
       SET summoner_name = $1, region = $2, summoner_id = $3, puuid = $4, updated_at = NOW() 
       WHERE id = $5 
       RETURNING id, username, email, summoner_name, region`,
      [name, region, summoner_id, puuid, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Perfil actualizado', user: result.rows[0] });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }
    console.error('Error al actualizar perfil:', error);
    // Error específico si no se encuentra el invocador en la API de Riot
    if (error.response && error.response.status === 404) {
      return NextResponse.json({ error: `Invocador "${summonerName}" no encontrado en la región ${region}.` }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
EOF
echo "Creado: src/app/api/user/profile/route.js"


echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡Flujo de vinculación de cuenta y API de Live Game listos! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Flujo de Usuario Implementado:${NC}"
echo -e "1.  Un usuario nuevo inicia sesión y aterriza en el Dashboard."
echo -e "2.  Se le presenta el formulario para vincular su Summoner Name."
echo -e "3.  Al guardar, la app consulta la API de Riot y almacena los IDs en nuestra base de datos."
echo -e "4.  La página se actualiza y ahora muestra el formulario principal de 'Análisis'."
echo -e "\nCon esta base, nuestro siguiente y último paso para activar el coaching es crear el servicio de backend que consulte periódicamente la partida en vivo y envíe los datos a la IA. ¡Estamos en la recta final, ingeniero!"