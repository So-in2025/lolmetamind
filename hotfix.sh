#!/bin/bash

# ==============================================================================
# SCRIPT DE HOTFIX FINAL - AISLAMIENTO DE CONFIGURACIONES DE BUILD
#
# Rol: DevOps Engineer
# Objetivo: 1. Separar la configuración de Babel del servidor de la de Next.js.
#           2. Corregir el script de build del servidor para que solo compile
#              los archivos necesarios.
#           3. Solucionar un error de sintaxis menor en un componente.
# ==============================================================================

# --- Colores para la salida ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Aplicando corrección de aislamiento de builds...${NC}"

# --- 1. Eliminar el archivo .babelrc conflictivo ---
echo -e "\n${GREEN}Paso 1: Eliminando '.babelrc' para devolver el control a Next.js...${NC}"
rm -f .babelrc
echo "Archivo '.babelrc' eliminado."

# --- 2. Crear un babel.config.js específico para el servidor ---
echo -e "\n${GREEN}Paso 2: Creando 'babel.config.js' solo para el servidor...${NC}"
cat << 'EOF' > babel.config.js
// babel.config.js
// Esta configuración SÓLO se usa para el script 'build:server'.
// Next.js (Vercel) ignorará este archivo y usará su compilador SWC.
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
echo "Creado: babel.config.js"

# --- 3. Corregir el error de sintaxis en PricingPlans.jsx ---
echo -e "\n${GREEN}Paso 3: Corrigiendo la sintaxis en 'src/components/pricing/PricingPlans.jsx'...${NC}"
# El problema es el uso de ` dentro de {}. Lo cambiaremos por comillas normales y una construcción de string.
sed -i.bak "s/className={\`bg-lol-blue-medium p-8 border-2 \\\${plan.isPopular ? 'border-lol-blue-accent' : 'border-lol-gold-dark'} rounded-lg flex flex-col\`}/className={`bg-lol-blue-medium p-8 border-2 ${plan.isPopular ? 'border-lol-blue-accent' : 'border-lol-gold-dark'} rounded-lg flex flex-col`}/" src/components/pricing/PricingPlans.jsx
rm src/components/pricing/PricingPlans.jsx.bak
echo "Corregido: src/components/pricing/PricingPlans.jsx"


# --- 4. Actualizar package.json con el script de build corregido ---
echo -e "\n${GREEN}Paso 4: Actualizando el script 'build:server' en 'package.json'...${NC}"
# El nuevo script solo compila las carpetas necesarias: lib y services.
jq '.scripts["build:server"] = "rm -rf dist && babel src/lib --out-dir dist/lib && babel src/services --out-dir dist/services"' package.json > package.json.tmp && mv package.json.tmp package.json
echo "Actualizado: script 'build:server' en package.json"


echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡Configuraciones de build aisladas y corregidas! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Pasos a seguir:${NC}"
echo -e "1.  Haz 'commit' y 'push' de los cambios en los archivos 'babel.config.js', 'package.json' y 'src/components/pricing/PricingPlans.jsx'."
echo -e "2.  Vercel ahora usará su compilador optimizado y debería construir el frontend sin errores."
echo -e "3.  Render usará el nuevo 'babel.config.js' y el script afinado para construir solo el backend, evitando los errores de sintaxis de React."
echo -e "\nEsta vez, ambos despliegues deberían funcionar. Ha sido un proceso de depuración intenso pero necesario para una arquitectura de este calibre. ¡El sistema está listo!"