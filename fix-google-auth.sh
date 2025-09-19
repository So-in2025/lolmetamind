#!/bin/bash

# ==============================================================================
# SCRIPT DE CORRECCIÓN - URL ABSOLUTA PARA AUTENTICACIÓN
# ==============================================================================

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Aplicando corrección para el flujo de autenticación de Google...${NC}"

# --- 1. Corrigiendo la URL en 'src/components/pricing/PricingPlans.jsx' ---
echo -e "\n${GREEN}Paso 1: Reemplazando la URL relativa por la absoluta...${NC}"

# Usamos 'sed' para buscar y reemplazar la URL en el archivo
sed -i.bak "s|window.location.href = '/api/auth/google';|window.location.href = 'https://couchmetamind.vercel.app/api/auth/google';|g" src/components/pricing/PricingPlans.jsx
rm src/components/pricing/PricingPlans.jsx.bak

echo -e "${GREEN}Corregido: src/components/pricing/PricingPlans.jsx. ✅${NC}"

echo -e "\n${CYAN}----------------------------------------------------------------------"
echo -e "¡Script finalizado! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Pasos a seguir:${NC}"
echo -e "1.  Haz 'commit' y 'push' de este cambio a tu repositorio."
echo -e "2.  Una vez que Vercel termine de desplegar, el botón de 'Empezar Gratis' funcionará correctamente."