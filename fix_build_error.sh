#!/bin/bash

# ==============================================================================
# SCRIPT DE CORRECCIÓN PARA EL ERROR DE SINTAXIS JSX EN VERCEL/RENDER
#
# Rol: Arquitecto de Software
# Objetivo: Corregir los caracteres de escape incorrectos en el componente PricingPlans.
# ==============================================================================

# --- Colores para la salida ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Iniciando script para corregir el error de sintaxis JSX...${NC}"

FILE_TO_FIX="src/components/pricing/PricingPlans.jsx"

if [ ! -f "$FILE_TO_FIX" ]; then
    echo -e "${RED}Error: El archivo ${FILE_TO_FIX} no se encontró.${NC}"
    exit 1
fi

echo -e "\n${CYAN}Reparando ${FILE_TO_FIX}...${NC}"

# Usamos sed para buscar las líneas exactas con los caracteres sobrantes y reemplazarlas.
# Usamos un delimitador diferente (#) para evitar conflictos con las barras.
sed -i.bak "s#className={\\\`bg-lol-blue-medium p-8 border-2 \\\${plan.isPopular ? 'border-lol-blue-accent' : 'border-lol-gold-dark'} rounded-lg flex flex-col\\\`}#className={\`bg-lol-blue-medium p-8 border-2 \${plan.isPopular ? 'border-lol-blue-accent' : 'border-lol-gold-dark'} rounded-lg flex flex-col\` }#" "$FILE_TO_FIX"
sed -i.bak "s#className={\\\`w-full py-3 font-display font-bold rounded-lg transition-colors \\\${plan.isPopular ? 'bg-lol-blue-accent text-lol-blue-dark hover:bg-cyan-500' : 'bg-lol-gold text-lol-blue-dark hover:bg-yellow-600'} disabled:opacity-50\\\`}#className={\`w-full py-3 font-display font-bold rounded-lg transition-colors \${plan.isPopular ? 'bg-lol-blue-accent text-lol-blue-dark hover:bg-cyan-500' : 'bg-lol-gold text-lol-blue-dark hover:bg-yellow-600'} disabled:opacity-50\` }#" "$FILE_TO_FIX"

# Limpiar el archivo de backup creado por sed
rm -f "${FILE_TO_FIX}.bak"

echo -e "\n${GREEN}¡Archivo corregido!${NC}"
echo -e "${YELLOW}----------------------------------------------------------------------${NC}"
echo -e "Ahora, sube los cambios a GitHub:"
echo -e "${CYAN}git add .${NC}"
echo -e "${CYAN}git commit -m \"Fix: Corrige error de sintaxis en PricingPlans\"${NC}"
echo -e "${CYAN}git push${NC}"
echo -e "\nRender/Vercel detectará el cambio y el nuevo despliegue debería funcionar sin errores."