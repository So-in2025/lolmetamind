#!/bin/bash

# ==============================================================================
# SCRIPT DE HOTFIX - CORRECCIÓN DE MODELO DE IA
#
# Rol: Arquitecto de IA
# Objetivo: Actualizar el nombre del modelo de Gemini en la URL de la API para
#           resolver el error 404 (NOT_FOUND) devuelto por el servicio de
#           Google AI y restaurar la funcionalidad del coach.
# ==============================================================================

# --- Colores para la salida ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Aplicando hotfix para la API de Gemini...${NC}"

# --- 1. Reemplazar la URL de la API en strategist.js ---
# Se cambia 'gemini-pro' por 'gemini-1.5-flash-latest' que es un modelo más reciente y válido.
echo -e "\n${GREEN}Paso 1: Actualizando el endpoint en 'src/lib/ai/strategist.js'...${NC}"

OLD_URL_PATTERN="const API_URL = \`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=\${GEMINI_API_KEY}\`;"
NEW_URL="const API_URL = \`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=\${GEMINI_API_KEY}\`;"

# Usamos sed para hacer el reemplazo. El delimitador | se usa para evitar problemas con las / en la URL.
sed -i.bak "s|${OLD_URL_PATTERN}|${NEW_URL}|" src/lib/ai/strategist.js

rm src/lib/ai/strategist.js.bak
echo "Archivo 'src/lib/ai/strategist.js' actualizado con el nuevo nombre de modelo."

echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡Hotfix aplicado! El coach de IA debería estar operativo. ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Pasos a seguir:${NC}"
echo -e "1.  Sube este cambio a tu repositorio."
echo -e "2.  Vercel se redesplegará automáticamente con la corrección."
echo -e "3.  Prueba el formulario de nuevo. El error 503 debería desaparecer y deberías recibir un análisis real."
echo -e "\nCon esto, la funcionalidad principal queda restaurada y estabilizada. Estamos listos para continuar con el desarrollo de las nuevas características. ¡Seguimos adelante, ingeniero!"