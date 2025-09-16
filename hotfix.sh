#!/bin/bash

# ==============================================================================
# SCRIPT DE HOTFIX - CORRECCIÓN DE BUILD PARA VERCEL Y RENDER
#
# Rol: DevOps Engineer
# Objetivo: 1. Corregir el package.json con los scripts faltantes.
#           2. Actualizar la configuración de Babel para que sea compatible
#              con la compilación de Next.js (React/JSX).
# ==============================================================================

# --- Colores para la salida ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Aplicando corrección final de configuración para despliegues...${NC}"

# --- 1. Instalar la dependencia de Babel para React ---
echo -e "\n${GREEN}Paso 1: Instalando '@babel/preset-react'...${NC}"
npm install --save-dev @babel/preset-react

# --- 2. Corregir el archivo de configuración de Babel (.babelrc) ---
echo -e "\n${GREEN}Paso 2: Actualizando '.babelrc' para incluir React...${NC}"
cat << 'EOF' > .babelrc
{
  "presets": [
    "@babel/preset-env",
    "@babel/preset-react"
  ]
}
EOF
echo "Actualizado: .babelrc"

# --- 3. Reemplazar package.json con la versión definitiva ---
echo -e "\n${GREEN}Paso 3: Reemplazando 'package.json' con la versión completa y correcta...${NC}"
cat << 'EOF' > package.json
{
  "name": "lol-metamind",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "build:server": "rm -rf dist && babel src --out-dir dist --copy-files",
    "start:server": "node websocket-server.js"
  },
  "dependencies": {
    "@paddle/paddle-node-sdk": "^3.2.1",
    "@tailwindcss/aspect-ratio": "^0.4.2",
    "autoprefixer": "^10.4.21",
    "axios": "^1.12.2",
    "bcryptjs": "^3.0.2",
    "dotenv": "^17.2.2",
    "fluent-ffmpeg": "^2.1.3",
    "framer-motion": "^12.23.12",
    "jsonwebtoken": "^9.0.2",
    "next": "^14.2.32",
    "pg": "^8.16.3",
    "react": "^18",
    "react-dom": "^18",
    "react-hook-form": "^7.52.0",
    "tailwindcss": "^3.4.17",
    "tailwindcss-textshadow": "^2.1.3",
    "ws": "^8.18.3"
  },
  "devDependencies": {
    "@babel/cli": "^7.24.7",
    "@babel/core": "^7.24.7",
    "@babel/preset-env": "^7.24.7",
    "@babel/preset-react": "^7.24.7",
    "eslint": "^8",
    "eslint-config-next": "14.2.4",
    "postcss": "^8.5.6"
  }
}
EOF
echo "Reemplazado: package.json"

echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡Corrección de despliegue aplicada! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Pasos a seguir:${NC}"
echo -e "1.  Asegúrate de que los archivos '.babelrc', 'package.json' y 'package-lock.json' estén actualizados."
echo -e "2.  Haz 'commit' y 'push' de estos cambios a tu repositorio de GitHub."
echo -e "3.  Los despliegues en Vercel y Render se activarán automáticamente y esta vez deberían completarse con éxito."
echo -e "\nEste era el último ajuste de configuración que necesitábamos. Con esto, ambos servicios deberían construir y ejecutarse sin problemas. ¡Estamos en la línea de meta!"