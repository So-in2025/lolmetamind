#!/bin/bash

# =========================================================================================
# SCRIPT DE CORRECCIÓN DEFINITIVA DE BABEL (FORCE CJS OUTPUT)
# Objetivo: Asegurar que los archivos en /dist sean CommonJS sin ambigüedad.
# =========================================================================================

REPO_PATH="so-in2025/lolmetamind/lolmetamind-4c93b36005431c7bc42c809ecd76beefdf126f70"
LIB_PATH="${REPO_PATH}/src/lib"

echo "--- 1. Modificando babel.config.server.js para forzar CommonJS en el output ---"

cat > "${REPO_PATH}/babel.config.server.js" << 'EOL'
// babel.config.server.js
// Configuración de Babel para el servidor de WebSockets (Render)
module.exports = {
  "presets": [
    [
      "@babel/preset-env",
      {
        "targets": {
          "node": "current"
        },
        // *** CORRECCIÓN CRÍTICA: FORZAR SALIDA COMO COMMONJS ***
        "modules": "commonjs"
      }
    ]
  ],
  "plugins": [
    [
      "module-resolver",
      {
        "root": ["./src"],
        "alias": {
          "@": "./src"
        }
      }
    ]
  ]
};
EOL
echo "babel.config.server.js actualizado para forzar salida CommonJS."

# Dejamos el archivo de DB y websocket-server.js como estaban, asumiendo que el output de Babel será la solución.

echo "--- 2. Asegurando el archivo de DB como CJS (última verificación) ---"
cat > "${LIB_PATH}/db/index.js" << 'EOL'
const { Pool } = require('pg');

let pool;

if (!global._pool) {
  global._pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
}
pool = global._pool;

const db = {
  query: (text, params) => pool.query(text, params),
  pool: pool,
};

module.exports = db;
EOL
echo "src/lib/db/index.js asegurado como CJS."


echo ""
echo "=========================================================="
echo "    ✅ SOLUCIÓN DEFINITIVA DE COMPILACIÓN APLICADA"
echo "=========================================================="
echo "Hemos forzado a Babel a que compile todos los archivos a CommonJS de forma explícita."
echo ""
echo "Acciones requeridas:"
echo "1. **Ejecuta este nuevo script de Bash en tu proyecto web local.**"
echo "2. **Haz un nuevo commit y deploy a Render.** (Esto debería resolver el problema al forzar el modo de módulo correcto)."