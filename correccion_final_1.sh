#!/bin/bash

# ==============================================================================
# SCRIPT DE HOTFIX - ReferenceError: isSubmitting is not defined
#
# Objetivo: Corregir el componente ProfileForm para que defina correctamente
#           la variable 'isSubmitting' que obtiene de react-hook-form.
# ==============================================================================

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Corrigiendo el 'ReferenceError' en ProfileForm.jsx...${NC}"

# --- Usamos 'sed' para reemplazar la línea incorrecta por la correcta ---
sed -i.bak "s/formState: { errors } } = useForm()/formState: { errors, isSubmitting } } = useForm()/g" src/components/forms/ProfileForm.jsx
rm src/components/forms/ProfileForm.jsx.bak

echo -e "${GREEN}El archivo 'src/components/forms/ProfileForm.jsx' ha sido corregido. ✅${NC}"
echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡HOTFIX APLICADO! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Pasos Finales:${NC}"
echo -e "1.  Sube este cambio a tu repositorio: ${GREEN}git add . && git commit -m \"hotfix: Definir isSubmitting en ProfileForm\" && git push${NC}"
echo -e "2.  Una vez Vercel termine de desplegar, el error desaparecerá."