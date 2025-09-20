#!/bin/bash

# ==============================================================================
# SCRIPT DE HOTFIX - CORRECCIÓN DE RUTA DINÁMICA EN NEXT.JS
#
# Objetivo: 1. Solucionar el error 'DYNAMIC_SERVER_USAGE' en la ruta /api/user/me.
#           2. Modificar la ruta para usar la función 'headers' de Next.js,
#              marcando la ruta como dinámica de forma correcta.
# ==============================================================================

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Corrigiendo el error de renderizado dinámico en la ruta /api/user/me...${NC}"

# --- Actualizar el endpoint /api/user/me para usar la función 'headers' ---
cat << 'EOF' > src/app/api/user/me/route.js
import { NextResponse } from 'next/server';
import { headers } from 'next/headers'; // Se importa la función 'headers' de Next.js
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET;

// Se añade esta línea para forzar el renderizado dinámico, la causa del error.
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const headersList = headers();
    const authorization = headersList.get('authorization');

    const token = authorization?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No autorizado: Token no encontrado.' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const result = await pool.query(
      'SELECT id, username, email, riot_id_name, riot_id_tagline, region FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
    }
    console.error('Error al obtener datos del usuario:', error);
    return NextResponse.json({ error: 'Error del servidor al obtener datos del usuario.' }, { status: 500 });
  }
}
EOF

echo -e "${GREEN}Archivo 'src/app/api/user/me/route.js' actualizado. ✅${NC}"
echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡HOTFIX APLICADO! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Pasos Finales:${NC}"
echo -e "1.  Haz 'commit' y 'push' de este cambio a tu repositorio."
echo -e "2.  Una vez Vercel termine de desplegar, el error desaparecerá y el login debería completarse correctamente."