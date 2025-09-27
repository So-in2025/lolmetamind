#!/bin/bash

# ==============================================================================
# SCRIPT DE LIMPIEZA PROFUNDA PARA LOLMETAMIND
# ADVERTENCIA: Este script eliminará permanentemente archivos y directorios.
# Se creará una copia de seguridad en la carpeta 'backup_cleanup' por seguridad.
# ==============================================================================

echo "Iniciando la limpieza general del proyecto LolMetaMind..."

# Directorio para la copia de seguridad con fecha y hora para evitar sobreescrituras
BACKUP_DIR="backup_cleanup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR/src/app/api"
mkdir -p "$BACKUP_DIR/src/app"
mkdir -p "$BACKUP_DIR/src/components"
mkdir -p "$BACKUP_DIR/src/context"

echo "Creado directorio de backup en: $BACKUP_DIR"

# --- LISTAS DE ARCHIVOS Y DIRECTORIOS A ELIMINAR ---

# PÁGINAS del frontend que ya no se usarán
PAGES_TO_DELETE=(
  "src/app/dashboard"
  "src/app/pricings"
  "src/app/builds"
)

# COMPONENTES del frontend que ya no se usarán
COMPONENTS_TO_DELETE=(
  "src/components/WeeklyChallenges.jsx"
  "src/components/forms/ProfileFlowForm.jsx"
  "src/components/pricing/PricingPlans.jsx"
  "src/components/widgets" # Eliminamos todos los widgets del frontend web
)

# CONTEXTOS del frontend que ya no se usarán
CONTEXTS_TO_DELETE=(
  "src/context/AuthContext.js"
)

# RUTAS DE API que estaban dedicadas al flujo de usuario del frontend
API_ROUTES_TO_DELETE=(
  "src/app/api/challenges"
  "src/app/api/user"
  "src/app/api/activate-trial"
  "src/app/api/license"
)

# --- FUNCIÓN DE RESPALDO Y BORRADO ---
backup_and_delete() {
  local item=$1
  local backup_path="$BACKUP_DIR/$item"
  
  # Asegurarse de que el directorio de destino del backup existe
  mkdir -p "$(dirname "$backup_path")"

  if [ -d "$item" ]; then
    echo "Haciendo backup y eliminando Directorio: $item"
    mv "$item" "$backup_path" 2>/dev/null || (cp -r "$item" "$backup_path" && rm -rf "$item")
  elif [ -f "$item" ]; then
    echo "Haciendo backup y eliminando Archivo: $item"
    mv "$item" "$backup_path" 2>/dev/null || (cp "$item" "$backup_path" && rm -f "$item")
  else
    echo "Advertencia: Elemento no encontrado, omitiendo: $item"
  fi
}

# --- INICIO DE LA OPERACIÓN ---

echo "--- Eliminando Páginas Viejas ---"
for page in "${PAGES_TO_DELETE[@]}"; do
  backup_and_delete "$page"
done

echo "--- Eliminando Componentes Viejos ---"
for component in "${COMPONENTS_TO_DELETE[@]}"; do
  backup_and_delete "$component"
done

echo "--- Eliminando Contextos Viejos ---"
for context in "${CONTEXTS_TO_DELETE[@]}"; do
  backup_and_delete "$context"
done

echo "--- Eliminando Rutas de API innecesarias ---"
for route in "${API_ROUTES_TO_DELETE[@]}"; do
  backup_and_delete "$route"
done

echo ""
echo "✅ ¡Limpieza completada!"
echo "Tu proyecto ahora está enfocado en ser una landing page."
echo "Una copia de seguridad de los elementos eliminados se guardó en: $BACKUP_DIR"

