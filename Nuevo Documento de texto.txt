#!/bin/bash

# ==============================================================================
# SCRIPT DE DEPURACIÓN - VERIFICACIÓN DE VARIABLES EN PRODUCCIÓN
# ==============================================================================

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Aplicando script de depuración para la API de autenticación de Google...${NC}"

# --- 1. Reescribiendo 'src/app/api/auth/google/route.js' temporalmente para depurar ---
echo -e "\n${GREEN}Paso 1: Reescribiendo 'src/app/api/auth/google/route.js'...${NC}"
cat << 'EOF' > src/app/api/auth/google/route.js
import { NextResponse } from 'next/server';

const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

export async function GET(request) {
  // Retorna el valor de la variable de entorno y el client ID para su verificación
  return NextResponse.json({
    message: 'Debug Mode: Verifying environment variables',
    GOOGLE_REDIRECT_URI: GOOGLE_REDIRECT_URI,
    GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID,
  });
}
EOF
echo -e "${GREEN}Archivo de depuración creado. ✅${NC}"

echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡Script de depuración aplicado! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Pasos a seguir:${NC}"
echo -e "1.  Haz 'commit' y 'push' de este cambio a tu repositorio."
echo -e "2.  Una vez que Vercel termine de desplegar, visita la URL directamente en tu navegador: \n    ${GREEN}https://couchmetamind.vercel.app/api/auth/google${NC}"
echo -e "3.  La página te mostrará un JSON con el valor exacto de la variable. Compara este valor con el que tienes en Google Cloud Console. Un solo carácter de diferencia es suficiente para que falle."
echo -e "4.  Una vez que verifiques y corrijas el valor, ${YELLOW}debes restaurar el código original de 'src/app/api/auth/google/route.js' y volver a desplegar.${NC}"