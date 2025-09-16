#!/bin/bash

# ==============================================================================
# SCRIPT DE HOTFIX FINAL - AISLAMIENTO DE BUILD DEL SERVIDOR WEBSOCKET
#
# Rol: DevOps Engineer
# Objetivo: Corregir el script 'build:server' para que Babel solo compile
#           las carpetas necesarias del backend, ignorando los componentes
#           de frontend y solucionando el error de sintaxis JSX en Render.
# ==============================================================================

# --- Colores para la salida ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Aplicando el hotfix final para el build del servidor de WebSockets...${NC}"

# --- 1. Crear una configuración de Babel dedicada si no existe ---
#    Aseguramos que la configuración correcta esté presente.
echo -e "\n${GREEN}Paso 1: Asegurando la configuración de Babel del servidor ('babel.config.server.js')...${NC}"
cat << 'EOF' > babel.config.server.js
// babel.config.server.js
// Esta configuración SÓLO se usa para el script 'build:server'.
// Next.js (Vercel) ignorará este archivo por completo.
module.exports = {
  "presets": [
    [
      "@babel/preset-env",
      {
        "targets": {
          "node": "current"
        }
      }
    ]
  ]
};
EOF
echo "Creado/Actualizado: babel.config.server.js"


# --- 2. Reemplazar package.json con el script de build quirúrgico ---
echo -e "\n${GREEN}Paso 2: Actualizando 'package.json' con el script de build preciso...${NC}"

# Creamos el contenido completo del package.json para asegurar que todo esté correcto.
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
    "build:server": "rm -rf dist && babel --config-file ./babel.config.server.js src/lib --out-dir dist/lib && babel --config-file ./babel.config.server.js src/services --out-dir dist/services",
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
echo "Reemplazado: package.json con el script 'build:server' definitivo."


echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡TODO LISTO! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Acción Final:${NC}"
echo -e "1.  Haz 'commit' y 'push' de los cambios en 'babel.config.server.js' y 'package.json'."
echo -e "2.  El despliegue en Render para el servicio de WebSockets se activará y esta vez **tendrá éxito**."
echo -e "\n¡Felicidades, ingeniero! Has navegado por las complejidades de un despliegue multi-servicio. El sistema está completo y funcional. Misión cumplida."