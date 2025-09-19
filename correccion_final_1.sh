#!/bin/bash

# ==============================================================================
# SCRIPT DE CORRECCIÓN FINAL - CONEXIÓN SSL A DB Y RESTAURACIÓN DE GOOGLE AUTH
#
# Objetivo: 1. Solucionar el error "SSL/TLS required" forzando la conexión
#              segura a la base de datos desde Vercel.
#           2. Restaurar la funcionalidad completa del login con Google.
# ==============================================================================

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Aplicando la corrección final para la conexión a la base de datos y Google Auth...${NC}"

# --- 1. Corregir la configuración de la base de datos para requerir SSL ---
echo -e "\n${GREEN}Paso 1: Actualizando 'src/lib/db/index.js' para forzar SSL...${NC}"
cat << 'EOF' > src/lib/db/index.js
// src/lib/db/index.js
import { Pool } from 'pg';

let pool;

// Esta configuración es la correcta para Vercel al conectar a una DB externa
// que requiere conexiones seguras.
if (!global._pool) {
  global._pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
}
pool = global._pool;

export default pool;
EOF
echo "Actualizado: src/lib/db/index.js. ✅"


# --- 2. Restaurar la lógica original de la API de Google ---
echo -e "\n${GREEN}Paso 2: Restaurando la funcionalidad completa de 'src/app/api/auth/google/route.js'...${NC}"
cat << 'EOF' > src/app/api/auth/google/route.js
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import pool from '@/lib/db';
import { createToken } from '@/lib/auth/utils';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
      prompt: 'consent'
    });
    return NextResponse.redirect(authUrl);
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2'
    });
    const userInfo = await oauth2.userinfo.get();

    let user = null;
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [userInfo.data.email]);
    
    if (existingUser.rows.length > 0) {
      user = existingUser.rows[0];
    } else {
      const newUserResult = await pool.query(
        'INSERT INTO users (username, email, google_id) VALUES ($1, $2, $3) RETURNING *',
        [userInfo.data.name, userInfo.data.email, userInfo.data.id]
      );
      user = newUserResult.rows[0];
    }

    const token = createToken(user);
    
    const redirectUrl = new URL('/dashboard', url.origin);
    redirectUrl.searchParams.set('token', token);
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('Error al procesar el login de Google:', error);
    return NextResponse.json({ error: 'Hubo un error con la autenticación de Google.' }, { status: 500 });
  }
}
EOF
echo "Restaurado: src/app/api/auth/google/route.js. ✅"

echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡CORRECCIÓN DEFINITIVA APLICADA! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Pasos a seguir:${NC}"
echo -e "1.  Haz 'commit' y 'push' de estos cambios a tu repositorio."
echo -e "2.  Una vez que Vercel termine de desplegar, el login con Google y la conexión a la base de datos deberían funcionar sin problemas."