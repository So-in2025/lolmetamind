#!/bin/bash

# ==============================================================================
# SCRIPT DE ACTUALIZACIÓN - ESQUEMA DE BASE DE DATOS
#
# Rol: Full-Stack Engineer
# Objetivo: 1. Asegurar que el esquema de la tabla 'users' sea 100% correcto.
#           2. Incluir todas las restricciones de unicidad necesarias.
# ==============================================================================

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Actualizando el archivo 'src/lib/db/schema.sql'...${NC}"

# Reconstruir el archivo de esquema completo y corregido
cat << 'EOF' > src/lib/db/schema.sql
-- src/lib/db/schema.sql
-- Esquema de base de datos para PostgreSQL en producción.

-- Elimina la tabla de usuarios si ya existe para evitar errores.
DROP TABLE IF EXISTS users CASCADE;

-- Crea la nueva tabla 'users' con los campos correctos.
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    zodiac_sign VARCHAR(50),
    
    -- Campos para el Riot ID y datos de League
    riot_id_name VARCHAR(255),
    riot_id_tagline VARCHAR(10),
    region VARCHAR(10),
    puuid VARCHAR(255) UNIQUE,
    summoner_id VARCHAR(255) UNIQUE,

    -- Campos para monetización con Paddle
    plan_status VARCHAR(50) DEFAULT 'free',
    paddle_customer_id VARCHAR(255) UNIQUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
EOF
echo -e "${GREEN}Archivo 'src/lib/db/schema.sql' actualizado con el esquema final. ✅${NC}"

echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡PROCESO FINALIZADO! ✅"
echo -e "----------------------------------------------------------------------${NC}"

echo -e "\n${CYAN}Pasos Finales y Cruciales:${NC}"
echo "1.  Ahora que el archivo está corregido, debes ejecutarlo en tu base de datos de Render."
echo "2.  Abre una nueva pestaña de SQL en DBeaver, copia y pega el contenido completo de 'src/lib/db/schema.sql' y ejecútalo."
echo "3.  Después, haz 'git commit' y 'git push' para subir los cambios del código."
echo -e "\n¡Con esto, todos tus problemas de persistencia y vinculación deberían estar resueltos! El proyecto está listo para la Fase 5."