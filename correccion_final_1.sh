#!/bin/bash

# ==============================================================================
# SCRIPT DE CORRECCIÓN FINAL - MANEJO DE VINCULACIÓN DUPLICADA
#
# Objetivo: 1. Añadir una validación en el backend para prevenir que un Riot ID
#              sea vinculado a más de una cuenta de LoL MetaMind.
#           2. Devolver un mensaje de error claro al usuario si el Riot ID
#              ya está en uso.
# ==============================================================================

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Aplicando la corrección para el manejo de Riot IDs duplicados...${NC}"

# --- Actualizar el endpoint del perfil con la nueva lógica de validación ---
echo -e "\n${GREEN}Paso 1: Actualizando la API en 'src/app/api/user/profile/route.js'...${NC}"
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
    const accountData = await getAccountByRiotId(gameName, tagLine, region);
    const { puuid } = accountData;

    // 2. Obtener datos del Invocador usando el PUUID
    const summonerData = await getSummonerByPuuid(puuid, region);
    const { id: summoner_id } = summonerData;

    // 3. *** NUEVA VALIDACIÓN ***
    // Verificar si este PUUID ya está vinculado a OTRA cuenta.
    const existingLink = await pool.query('SELECT id FROM users WHERE puuid = $1 AND id != $2', [puuid, userId]);
    if (existingLink.rows.length > 0) {
      return NextResponse.json({ error: 'Este Riot ID ya está vinculado a otra cuenta de LoL MetaMind.' }, { status: 409 }); // 409 Conflict
    }

    // 4. Actualizar nuestra base de datos
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
    if (error.code === '23505') { // Código de error de PostgreSQL para violación de unicidad
      return NextResponse.json({ error: 'Este Riot ID ya está vinculado a otra cuenta.' }, { status: 409 });
    }
    if (error.response?.status === 404) {
      return NextResponse.json({ error: `Riot ID no encontrado. Verifica el nombre, tagline y región.` }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error interno del servidor al procesar la solicitud.' }, { status: 500 });
  }
}
EOF
echo "Actualizado: src/app/api/user/profile/route.js. ✅"

echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡LÓGICA DE VINCULACIÓN REFORZADA! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Pasos Finales:${NC}"
echo -e "1.  Sube este cambio a tu repositorio. Vercel se redesplegará."
echo -e "2.  **Importante:** Antes de probar, es posible que necesites limpiar los datos de prueba en tu base de datos. Inicia sesión con la cuenta de Google que quieres usar, y si otra cuenta ya tiene tu Riot ID, deberás eliminar la vinculación de esa otra cuenta manualmente desde tu gestor de base de datos (como DBeaver o la consola de Render)."
echo -e "3.  Una vez limpia la base de datos, intenta vincular tu Riot ID de nuevo. ¡Ahora debería funcionar!"