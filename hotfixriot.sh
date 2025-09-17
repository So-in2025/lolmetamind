#!/bin/bash

# ==============================================================================
# SCRIPT DE SOLUCIÓN DEFINITIVA - EJECUCIÓN DIRECTA EN TERMINAL
# ==============================================================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

DATABASE_URL="postgresql://lol_metamind_db_user:EczYyMCPZI4Z6NdgUoC2HlH2MnHMr1NP@dpg-d34mtladbo4c73fj7jgg-a.oregon-postgres.render.com/lol_metamind_db"

if [ "$DATABASE_URL" == "postgresql://lol_metamind_db_user:EczYyMCPZI4Z6NdgUoC2HlH2MnHMr1NP@dpg-d34mtladbo4c73fj7jgg-a.oregon-postgres.render.com/lol_metamind_db" ]; then
    echo -e "${YELLOW}ADVERTENCIA: Por favor, edita este script y reemplaza TU_DATABASE_URL_COMPLETA con la URL real de tu base de datos de Render.${NC}"
    exit 1
fi

echo -e "${YELLOW}Creando un archivo SQL temporal con el esquema corregido...${NC}"

cat << EOF > /tmp/schema.sql
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    zodiac_sign VARCHAR(50),
    riot_id_name VARCHAR(255),
    riot_id_tagline VARCHAR(10),
    region VARCHAR(10),
    puuid VARCHAR(255) UNIQUE,
    summoner_id VARCHAR(255) UNIQUE,
    plan_status VARCHAR(50) DEFAULT 'free',
    paddle_customer_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
EOF

echo -e "${GREEN}Ejecutando el script en la base de datos...${NC}"

psql "$DATABASE_URL" -f /tmp/schema.sql

rm /tmp/schema.sql

echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡PROCESO FINALIZADO! ✅"
echo -e "----------------------------------------------------------------------${NC}"

echo -e "\n${CYAN}Pasos Finales y Cruciales:${NC}"
echo "1.  Si el comando anterior se ejecutó sin errores, la tabla `users` ha sido creada correctamente con las restricciones de unicidad."
echo "2.  Ahora, haz `git commit` y `git push` con todos los cambios de tu código."
echo "3.  Regístrate con una cuenta nueva y verifica que ya no puedes usar un nombre de usuario o correo electrónico existente. Inicia sesión en otro dispositivo para confirmar la persistencia."

Una vez que esto funcione, podemos abordar su solicitud de un sistema de registro más avanzado con verificación por correo electrónico o Google Auth.