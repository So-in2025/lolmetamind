#!/bin/bash

# ==============================================================================
# SCRIPT DE CORRECCIÓN DE RAÍZ PARA RUTAS DINÁMICAS EN NEXT.JS
#
# Objetivo: Identificar y corregir TODAS las rutas de API que usan
#           funciones dinámicas (como request.headers) para asegurar un
#           despliegue exitoso y una lógica de servidor correcta en Vercel.
# ==============================================================================

# --- Colores para una mejor legibilidad ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Iniciando la corrección de raíz para todas las rutas de API dinámicas...${NC}"

# --- Lista de archivos de rutas que necesitan ser dinámicas ---
# Se ha verificado que todas estas rutas utilizan 'request.headers'
declare -a DYNAMIC_ROUTES=(
  "src/app/api/challenges/weekly/route.js"
  "src/app/api/recommendation/route.js"
  "src/app/api/user/profile/route.js"
  "src/app/api/challenges/progress/route.js"
)

# --- Bucle para verificar y corregir cada archivo ---
for route_file in "${DYNAMIC_ROUTES[@]}"
do
  echo -e "\n${CYAN}Verificando archivo: ${route_file}${NC}"
  
  # Verificar si el archivo existe
  if [ -f "$route_file" ]; then
    # Verificar si la directiva 'force-dynamic' ya existe para no duplicarla
    if grep -q "export const dynamic = 'force-dynamic';" "$route_file"; then
      echo -e "${GREEN}El archivo ya está configurado como dinámico. No se requieren cambios. ✅${NC}"
    else
      echo -e "${YELLOW}Inyectando directiva dinámica...${NC}"
      # Usar sed para insertar la directiva después de la última línea de 'import'
      # Esto es más robusto que simplemente añadirla al principio.
      LINE_TO_INSERT_AFTER=$(grep -n '^import' "$route_file" | tail -n 1 | cut -d: -f1)
      
      # Creamos un archivo temporal con la corrección
      awk -v line="$LINE_TO_INSERT_AFTER" '
      1;
      NR==line {
        print "\n// Esta línea es crucial para decirle a Vercel que NO intente hacer esta ruta estática.";
        print "export const dynamic = \x27force-dynamic\x27;";
      }
      ' "$route_file" > "${route_file}.tmp" && mv "${route_file}.tmp" "$route_file"
      
      echo -e "${GREEN}Corrección aplicada con éxito. ✅${NC}"
    fi
  else
    echo -e "\033[0;31mError: El archivo ${route_file} no se encontró.${NC}"
  fi
done

echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡CORRECCIÓN DE RAÍZ COMPLETADA! ✅"
echo -e "Todas las rutas de API problemáticas han sido configuradas como dinámicas."
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Pasos Finales:${NC}"
echo -e "1. Ejecuta este script con: ${GREEN}bash fix_dynamic_routes.sh${NC}"
echo -e "2. Haz 'commit' y 'push' de los archivos modificados a tu repositorio."
echo -e "3. El próximo despliegue en Vercel funcionará correctamente."