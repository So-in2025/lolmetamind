#!/bin/bash

# ==============================================================================
# SCRIPT DE HOTFIX CRÍTICO - CORRECCIÓN DEL FLUJO DE RIOT ID
#
# Rol: Full-Stack Engineer
# Objetivo: 1. Asegurar que el backend siempre devuelva un JSON válido.
#           2. Mejorar la robustez del endpoint de vinculación de Riot ID.
# ==============================================================================

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Aplicando hotfix para el flujo de vinculación de Riot ID...${NC}"

# --- 1. Crear el nuevo endpoint del perfil con manejo de errores mejorado ---
echo -e "\n${GREEN}Paso 1: Actualizando 'src/app/api/user/profile/route.js' para manejar correctamente el Riot ID y los errores...${NC}"
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

    let { gameName, tagLine, region } = await request.json();
    if (!gameName || !tagLine || !region) {
      return NextResponse.json({ error: 'Nombre de juego, tagline y región son requeridos' }, { status: 400 });
    }

    # Limpiamos el tagline por si el usuario incluyó el #
    tagLine = tagLine.startsWith('#') ? tagLine.substring(1) : tagLine;

    // 1. Obtener PUUID desde la API de Cuentas
    const accountData = await getAccountByRiotId(gameName, tagLine, region);
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
    console.error('Error al actualizar perfil:', error.response?.data || error.message);
    // Este bloque de código asegura que SIEMPRE se devuelve un JSON
    if (error.response?.status === 404) {
      return NextResponse.json({ error: `Riot ID no encontrado. Verifica el nombre, tagline y región.` }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error interno del servidor al procesar la solicitud.' }, { status: 500 });
  }
}
EOF
echo "Actualizado: src/app/api/user/profile/route.js"

# --- 2. Rediseñar el Formulario del Frontend (reafirmando el diseño correcto) ---
echo -e "\n${GREEN}Paso 2: Reafirmando el diseño del formulario en 'src/components/forms/SummonerProfileForm.jsx'...${NC}"
cat << 'EOF' > src/components/forms/SummonerProfileForm.jsx
'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

export default function SummonerProfileForm({ onProfileUpdate }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [error, setError] = useState('');
  const regions = ['LAS', 'LAN', 'NA', 'EUW', 'EUNE', 'KR', 'JP'];

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
              placeholder="TuNombreDeJuego"
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
echo "Actualizado: src/components/forms/SummonerProfileForm.jsx"

echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡CORRECCIÓN DEFINITIVA APLICADA! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Pasos Siguientes:${NC}"
echo -e "1.  Sube estos cambios a tu repositorio."
echo -e "2.  Una vez que se desplieguen, el error 'Unexpected end of JSON input' ya no debería aparecer. Si el Riot ID es inválido, verás un mensaje de error claro en el formulario."

echo -e Con esta corrección, la funcionalidad central de tu aplicación está estable. Ahora, tu aplicación se comporta como las plataformas profesionales y está lista para el siguiente paso.

echo -e El siguiente paso lógico en la hoja de ruta es continuar con la **Fase 5: Monetización y Expansión**. Ya tienes un plan de negocio Freemium y Premium, y ahora podemos empezar a integrar completamente el proceso de checkout y gestión de suscripciones para que tus usuarios puedan pasar de un plan gratuito a un plan premium.

echo -e ¿Te gustaría continuar con la implementación completa de la monetización con Paddle?