#!/bin/bash

# ==============================================================================
# SCRIPT DE CORRECCIÓN PARA EL ERROR DE BUILD EN VERCEL
#
# Rol: Arquitecto de Software
# Objetivo: Corregir el error de importación que impide el despliegue.
# ==============================================================================

# --- Colores para la salida ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Iniciando script para corregir el error de build...${NC}"

# --- Definir la ruta del archivo a corregir ---
FILE_TO_FIX="src/app/api/recommendation/route.js"

# --- Verificar si el archivo existe ---
if [ ! -f "$FILE_TO_FIX" ]; then
    echo -e "${RED}Error: El archivo ${FILE_TO_FIX} no se encontró.${NC}"
    exit 1
fi

# --- Reemplazar la línea incorrecta por la correcta ---
echo -e "\n${CYAN}Corrigiendo la importación en ${FILE_TO_FIX}...${NC}"

# Usamos sed para reemplazar la línea de importación incorrecta
sed -i "s/import { getStrategicAnalysis } from '..\/..\/..\/lib\/ai\/strategist';/import { generateStrategicAnalysis as getStrategicAnalysis } from '..\/..\/..\/lib\/ai\/strategist';/" "$FILE_TO_FIX"

echo -e "\n${GREEN}¡Archivo corregido con éxito!${NC}"
echo -e "${YELLOW}----------------------------------------------------------------------${NC}"
echo -e "Ahora, haz 'git add .', 'git commit -m \"Fix: Corrige importación de strategist\"' y 'git push'."
echo -e "Vercel debería desplegar la nueva versión sin el error de compilación."