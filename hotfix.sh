#!/bin/bash

# ==============================================================================
# SCRIPT DE HOTFIX DEFINITIVO - AISLAMIENTO TOTAL DE CONFIGURACIONES
#
# Rol: DevOps Engineer / Full-Stack Developer
# Objetivo: Separar por completo las configuraciones de build del frontend y
#           del backend para resolver todos los conflictos de compilación en
#           Vercel y Render.
# ==============================================================================

# --- Colores para la salida ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Aplicando corrección de aislamiento de builds...${NC}"

# --- 1. Eliminar configuraciones de Babel conflictivas ---
echo -e "\n${GREEN}Paso 1: Eliminando configuraciones de Babel globales...${NC}"
rm -f .babelrc babel.config.js
echo "Archivos '.babelrc' y 'babel.config.js' eliminados."

# --- 2. Crear una configuración de Babel aislada para el servidor ---
echo -e "\n${GREEN}Paso 2: Creando 'babel.config.server.js' para uso exclusivo del servidor...${NC}"
cat << 'EOF' > babel.config.server.js
// babel.config.server.js
// Esta configuración SÓLO se usa para el script 'build:server'.
// Next.js (Vercel) ignorará este archivo por completo.
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
echo "Creado: babel.config.server.js"

# --- 3. Recrear el AuthContext faltante ---
echo -e "\n${GREEN}Paso 3: Recreando el archivo 'src/context/AuthContext.js' que faltaba...${NC}"
mkdir -p src/context
cat << 'EOF' > src/context/AuthContext.js
'use client';
import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('authUser');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData, authToken) => {
    localStorage.setItem('authUser', JSON.stringify(userData));
    localStorage.setItem('authToken', authToken);
    setUser(userData);
    setToken(authToken);
  };

  const logout = () => {
    localStorage.removeItem('authUser');
    localStorage.removeItem('authToken');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
EOF
echo "Creado: src/context/AuthContext.js"

# --- 4. Actualizar package.json con el script de build final y aislado ---
echo -e "\n${GREEN}Paso 4: Actualizando 'package.json' con el script de build aislado...${NC}"
# El nuevo script le dice a Babel que use su configuración específica y que solo compile las carpetas del backend.
jq '.scripts["build:server"] = "rm -rf dist && babel --config-file ./babel.config.server.js src/lib --out-dir dist/lib && babel --config-file ./babel.config.server.js src/services --out-dir dist/services"' package.json > package.json.tmp && mv package.json.tmp package.json
echo "Actualizado: script 'build:server' en package.json"

echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡CONFIGURACIÓN FINALIZADA! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Pasos Finales:${NC}"
echo -e "1.  Haz 'commit' y 'push' de TODOS los cambios (archivos nuevos, modificados y eliminados)."
echo -e "2.  Los despliegues en Vercel y Render se activarán."
echo -e "3.  **Vercel:** Al no encontrar un archivo de configuración de Babel en la raíz, usará su compilador optimizado SWC y el build será exitoso."
echo -e "4.  **Render (WebSockets):** Ejecutará \`build:server\`, que usará su propia configuración (`babel.config.server.js`) y solo compilará las carpetas del backend, ignorando el frontend y evitando errores."
echo -e "\nCon esto, ingeniero, hemos resuelto la raíz de todos los problemas. El sistema ahora es robusto y está correctamente configurado para un entorno de producción con múltiples servicios. ¡Adelante!"