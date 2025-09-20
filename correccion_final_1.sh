#!/bin/bash

# ==============================================================================
# SCRIPT DE CORRECCIÓN DEFINITIVA - DYNAMIC SERVER USAGE
#
# Objetivo: Forzar el renderizado dinámico en la ruta /api/user/me para
#           solucionar el error de Vercel de forma definitiva.
# ==============================================================================

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Aplicando corrección definitiva para el error 'DYNAMIC_SERVER_USAGE'...${NC}"

# --- Reescribir la ruta /api/user/me con la configuración correcta para Vercel ---
cat << 'EOF' > src/app/api/user/me/route.js
import { NextResponse } from 'next/server';
import { headers } from 'next/headers'; // Importar 'headers' de 'next/headers' es la forma moderna.
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET;

// Esta línea es crucial para decirle a Vercel que NO intente hacer esta ruta estática.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const headersList = headers();
    const authorization = headersList.get('authorization');

    if (!authorization) {
      return NextResponse.json({ error: 'No autorizado: Cabecera de autorización no encontrada.' }, { status: 401 });
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No autorizado: Token mal formateado.' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const result = await pool.query(
      'SELECT id, username, email, riot_id_name, riot_id_tagline, region FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado en la base de datos.' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ error: 'Token inválido o expirado.' }, { status: 401 });
    }
    console.error('Error crítico en /api/user/me:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
EOF

echo -e "${GREEN}Archivo 'src/app/api/user/me/route.js' corregido y reforzado. ✅${NC}"
echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡SOLUCIÓN REFORZADA APLICADA! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Pasos Finales (por última vez):${NC}"
echo -e "1.  Sube este cambio a tu repositorio: ${GREEN}git add . && git commit -m \"fix: Forzar renderizado dinámico en la ruta /api/user/me\" && git push${NC}"
echo -e "2.  Espera a que Vercel complete el nuevo despliegue."
echo -e "3.  Prueba el flujo de inicio de sesión de nuevo."