#!/bin/bash

# ==============================================================================
# SCRIPT DE CORRECCIÓN - ERROR DE AUTENTICACIÓN DE GOOGLE
# ==============================================================================

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Aplicando corrección para la API de autenticación de Google...${NC}"

# --- 1. Reescribiendo 'src/app/api/auth/google/route.js' con lógica mejorada ---
echo -e "\n${GREEN}Paso 1: Reescribiendo 'src/app/api/auth/google/route.js' con lógica mejorada...${NC}"
cat << 'EOF' > src/app/api/auth/google/route.js
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import pool from '@/lib/db';
import { createToken } from '@/lib/auth/utils';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const JWT_SECRET = process.env.JWT_SECRET;

// Log para depuración, puedes eliminarlo después
console.log('Using GOOGLE_REDIRECT_URI:', GOOGLE_REDIRECT_URI);

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    console.error('Error: No se encontró el código de autenticación en la URL de redirección.');
    return NextResponse.json({ error: 'No se proporcionó un código de autenticación.' }, { status: 400 });
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

    const token = createToken({ userId: user.id, username: user.username });
    
    const redirectUrl = new URL('/dashboard', url.origin);
    redirectUrl.searchParams.set('token', token);
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('Error al procesar el login de Google:', error);
    return NextResponse.json({ error: 'Hubo un error con la autenticación de Google.' }, { status: 500 });
  }
}
EOF
echo -e "${GREEN}Actualizado: src/app/api/auth/google/route.js. ✅${NC}"

echo -e "\n${CYAN}----------------------------------------------------------------------"
echo -e "¡Script finalizado! ✅"
echo -e "----------------------------------------------------------------------${NC}"