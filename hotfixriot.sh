#!/bin/bash

# ==============================================================================
# SCRIPT DE REEMPLAZO COMPLETO - SISTEMA DE AUTENTICACIÓN
# ==============================================================================

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Iniciando la eliminación del sistema de autenticación actual...${NC}"

# --- 1. Eliminar archivos antiguos de registro y login ---
echo -e "\n${GREEN}Paso 1: Eliminando páginas y rutas de API antiguas...${NC}"
rm "src/app/(auth)/login/page.jsx"
rm "src/app/(auth)/register/page.jsx"
rm "src/app/api/auth/login/route.js"
rm "src/app/api/auth/register/route.js"
rm -rf "src/app/api/auth/login"
rm -rf "src/app/api/auth/register"
echo "Archivos de autenticación antiguos eliminados. ✅"


# --- 2. Reconstruir el esquema de la base de datos ---
echo -e "\n${GREEN}Paso 2: Reconstruyendo 'src/lib/db/schema.sql' para el nuevo sistema...${NC}"
cat << 'EOF' > src/lib/db/schema.sql
-- src/lib/db/schema.sql
-- Esquema de base de datos para PostgreSQL en producción.

-- Se eliminan las tablas existentes para asegurar un esquema limpio.
DROP TABLE IF EXISTS users CASCADE;

-- Tabla de Usuarios actualizada para Riot ID y Paddle
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
echo -e "Esquema de base de datos reconstruido con el formato correcto. ✅"


# --- 3. Actualizar la página principal con el nuevo botón de login ---
echo -e "\n${GREEN}Paso 3: Modificando 'src/app/page.jsx' para usar el botón de Google Login...${NC}"
cat << 'EOF' > src/app/page.jsx
import PricingPlans from '@/components/pricing/PricingPlans'
import LoginButtons from '@/components/auth/LoginButtons'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col justify-start items-center p-8 bg-lol-blue-dark text-lol-gold-light font-body">
      <div className="w-full max-w-lg mb-8 text-center">
        <h1 className="text-5xl md:text-6xl font-display font-bold text-lol-blue-accent mb-4 text-shadow-lg">
          LoL MetaMind
        </h1>
        <p className="text-lg md:text-xl text-lol-gold-light/90 mb-6">
          La plataforma de coaching de League of Legends con IA que te da una ventaja estratégica.
        </p>
      </div>
      
      <PricingPlans />

      <div className="mt-8">
        <LoginButtons />
      </div>
    </main>
  );
}
EOF
echo "Actualizado: src/app/page.jsx con el nuevo botón de login. ✅"

# --- 4. Crear el nuevo componente de botones de login ---
echo -e "\n${GREEN}Paso 4: Creando el nuevo componente 'src/components/auth/LoginButtons.jsx'...${NC}"
mkdir -p src/components/auth
cat << 'EOF' > src/components/auth/LoginButtons.jsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function LoginButtons() {
  const router = useRouter();
  const handleGoogleLogin = () => {
    // Lógica para iniciar el flujo de Google OAuth (por implementar)
    alert("Iniciando sesión con Google...");
    // router.push('/api/auth/google'); // Esto es lo que se llamaría en un flujo real
  };

  return (
    <div className="flex flex-col space-y-4">
      <button
        onClick={handleGoogleLogin}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 shadow-lg"
      >
        Login con Google
      </button>
    </div>
  );
}
EOF
echo "Creado: src/components/auth/LoginButtons.jsx. ✅"


echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡SISTEMA DE AUTENTICACIÓN REEMPLAZADO! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Pasos Siguientes:${NC}"
echo "1.  Sube todos los cambios a tu repositorio de GitHub."
echo "2.  Configura Google OAuth en tu consola de Google y añade las variables de entorno necesarias (Client ID y Client Secret)."
echo "3.  Implementa la lógica real del endpoint de Google OAuth en '/api/auth/google' y en el componente 'LoginButtons'."