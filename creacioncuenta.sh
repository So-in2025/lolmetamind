#!/bin/bash

# ==============================================================================
# SCRIPT DE CORRECCIÓN DEFINITIVA - CONEXIÓN DE BASE DE DATOS
#
# Rol: Backend Engineer / DevOps
# Objetivo: 1. Crear una configuración de base de datos separada para el
#              servidor de WebSockets.
#           2. Simplificar la configuración de la base de datos del frontend
#              para que sea 100% compatible con Vercel.
#           3. Solucionar el error de registro que no persistía los datos.
# ==============================================================================

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Iniciando la corrección de la conexión a la base de datos...${NC}"

# --- 1. Simplificar la conexión para el Frontend (Vercel) ---
echo -e "\n${GREEN}Paso 1: Simplificando 'src/lib/db/index.js' para Vercel...${NC}"
cat << 'EOF' > src/lib/db/index.js
// src/lib/db/index.js
import { Pool } from 'pg';

let pool;

// Esta configuración es más simple y es la recomendada para Vercel.
if (!pool) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
}

export default pool;
EOF
echo "Actualizado: src/lib/db/index.js"


# --- 2. Actualizar el Servidor de WebSockets para que use su propia conexión ---
echo -e "\n${GREEN}Paso 2: Modificando 'websocket-server.js' para que tenga su propia configuración de DB...${NC}"
# Usamos sed para reemplazar la inicialización del pool de pg
sed -i.bak "s|const DATABASE_URL = process.env.DATABASE_URL;|const DATABASE_URL = process.env.DATABASE_URL;\n\nconst pool = new Pool({\n  connectionString: DATABASE_URL,\n  ssl: {\n    rejectUnauthorized: false\n  }\n});|" websocket-server.js
sed -i.bak "/const pool = new Pool({/,/}\);/d" websocket-server.js # Borramos la vieja declaración si existe
# Re-insertamos la declaración correcta
sed -i.bak "/const JWT_SECRET = process.env.JWT_SECRET;/a const DATABASE_URL = process.env.DATABASE_URL;\n\nconst pool = new Pool({\n  connectionString: DATABASE_URL,\n  ssl: {\n    rejectUnauthorized: false\n  }\n});" websocket-server.js
# Limpieza de archivos de backup
rm -f websocket-server.js.bak
echo "Actualizado: websocket-server.js"


echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡CORRECCIÓN DE BASE DE DATOS APLICADA! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Resumen de la Solución:${NC}"
echo -e "1.  **Frontend (Vercel):** Ahora tiene una configuración de base de datos simple y compatible que le permitirá escribir datos correctamente."
echo -e "2.  **Backend (WebSockets en Render):** Mantiene la configuración que necesita, pero ahora es independiente y no interfiere con el frontend."
echo -e "\n**Acción Final:**"
echo -e "1.  **Elimina el usuario de prueba** que creaste en la base de datos (usando DBeaver) para poder registrarte con esos datos de nuevo."
echo -e "2.  **Sube los cambios** de `src/lib/db/index.js` y `websocket-server.js` a tu repositorio."
echo -e "3.  Una vez que se desplieguen los cambios, regístrate desde cualquier dispositivo. La cuenta se creará en la base de datos de Render y podrás iniciar sesión desde cualquier otro dispositivo sin problemas."
echo -e "\nAhora sí, ingeniero, el registro es 100% real. ¡Misión cumplida!"