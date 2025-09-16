#!/bin/bash

# ==============================================================================
# SCRIPT DE AUTOMATIZACIÓN PARA LA FASE 4 DE LOL METAMIND (NEXT.JS)
#
# Rol: Arquitecto de Backend
# Objetivo: Implementar la base de datos PostgreSQL y el sistema de autenticación
#           para el despliegue en Vercel y Render.
# ==============================================================================

# --- Colores para la salida ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Iniciando script para Fase 4: Escalabilidad y Base de Datos (Next.js)...${NC}"

# --- 1. Instalación de Dependencias de Backend ---
echo -e "\n${GREEN}Paso 1: Instalando dependencias de producción (pg, jsonwebtoken, bcryptjs)...${NC}"
npm install pg jsonwebtoken bcryptjs
echo -e "${GREEN}Dependencias instaladas con éxito.${NC}"

# --- 2. Creación de la Estructura y Configuración de la Base de Datos ---
echo -e "\n${GREEN}Paso 2: Creando la configuración y el esquema de la base de datos...${NC}"

mkdir -p src/lib/db
touch src/lib/db/schema.sql
touch src/lib/db/index.js

# Crear el esquema SQL para PostgreSQL (listo para Render)
cat <<EOL > src/lib/db/schema.sql
-- src/lib/db/schema.sql
-- Esquema de base de datos para PostgreSQL en producción.

-- Tabla de Usuarios
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    summoner_name VARCHAR(255),
    zodiac_sign VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Se pueden añadir más tablas aquí, como las de gamificación.
EOL

# Crear el cliente de conexión a la base de datos para Render
cat <<EOL > src/lib/db/index.js
// src/lib/db/index.js
import { Pool } from 'pg';

let pool;

if (!pool) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
}

export default pool;
EOL

echo -e "${GREEN}Estructura de la base de datos creada y configurada para Render.${NC}"

# --- 3. Creación de la Lógica y Utilidades de Autenticación ---
echo -e "\n${GREEN}Paso 3: Creando las utilidades para la autenticación...${NC}"

mkdir -p src/lib/auth
touch src/lib/auth/utils.js

cat <<EOL > src/lib/auth/utils.js
// src/lib/auth/utils.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Genera un hash de una contraseña.
 */
export const hashPassword = (password) => {
  return bcrypt.hash(password, 10);
};

/**
 * Compara una contraseña con su hash.
 */
export const comparePassword = (password, hash) => {
  return bcrypt.compare(password, hash);
};

/**
 * Crea un token JWT para un usuario.
 */
export const createToken = (user) => {
  if (!JWT_SECRET) {
    throw new Error('La clave secreta JWT no está definida en las variables de entorno.');
  }
  return jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: '7d', // El token expira en 7 días
  });
};
EOL

echo -e "${GREEN}Utilidades de autenticación creadas.${NC}"

# --- 4. Creación de las Rutas de API para Registro y Login ---
echo -e "\n${GREEN}Paso 4: Creando las rutas de API para la autenticación del usuario...${NC}"

mkdir -p src/app/api/auth/register
mkdir -p src/app/api/auth/login

# Ruta para el registro de usuarios
touch src/app/api/auth/register/route.js
cat <<EOL > src/app/api/auth/register/route.js
// src/app/api/auth/register/route.js
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hashPassword } from '@/lib/auth/utils';

export async function POST(request) {
  const { username, email, password } = await request.json();

  if (!username || !email || !password) {
    return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 });
  }

  try {
    // Verificar si el usuario ya existe
    const existingUser = await pool.query('SELECT * FROM users WHERE email = \$1 OR username = \$2', [email, username]);
    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: 'El email o nombre de usuario ya está en uso' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    // Insertar nuevo usuario
    const newUserResult = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES (\$1, \$2, \$3) RETURNING id, username, email, created_at',
      [username, email, passwordHash]
    );

    const newUser = newUserResult.rows[0];

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Error en el registro:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
EOL

# Ruta para el inicio de sesión de usuarios
touch src/app/api/auth/login/route.js
cat <<EOL > src/app/api/auth/login/route.js
// src/app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { comparePassword, createToken } from '@/lib/auth/utils';

export async function POST(request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = \$1', [email]);
    const user = result.rows[0];

    if (!user) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const { password_hash, ...userToSign } = user;
    const token = createToken(userToSign);

    return NextResponse.json({ token, user: userToSign });
  } catch (error) {
    console.error('Error en el login:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
EOL

# --- 5. Actualización de las Variables de Entorno ---
echo -e "\n${GREEN}Paso 5: Preparando el archivo .env.local para las nuevas variables...${NC}"
{
  echo ""
  echo "# ================================================"
  echo "# VARIABLES PARA LA FASE 4: BASE DE DATOS Y AUTH"
  echo "# ================================================"
  echo "# URL de conexión a tu base de datos PostgreSQL en Render"
  echo "# EJEMPLO: DATABASE_URL=\"postgresql://user:password@host:port/database\""
  echo "DATABASE_URL=\"\""
  echo ""
  echo "# Clave secreta para firmar los JSON Web Tokens (JWT). Generada automáticamente."
  echo "JWT_SECRET=\"$(openssl rand -hex-32)\""
} >> .env.local

echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡La preparación para la Fase 4 ha finalizado! 🚀"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}ACCIONES REQUERIDAS POR TI:${NC}"
echo -e "1.  ${CYAN}Configura tu Base de Datos en Render:${NC}"
echo -e "    - Crea un nuevo servicio de tipo 'PostgreSQL' en tu cuenta de Render."
echo -e "    - Render te proporcionará una 'Internal Connection String' o 'External Connection String'."
echo -e "    - Copia esa URL de conexión."
echo ""
echo -e "2.  ${CYAN}Actualiza las Variables de Entorno:${NC}"
echo -e "    - ${YELLOW}Localmente:${NC} Abre el archivo ${GREEN}.env.local${NC} y pega la URL de tu base de datos en la variable ${GREEN}DATABASE_URL${NC}."
echo -e "    - ${YELLOW}En Vercel:${NC} Ve a la configuración de tu proyecto en Vercel, sección 'Environment Variables', y añade ${GREEN}DATABASE_URL${NC} y ${GREEN}JWT_SECRET${NC} con sus respectivos valores."
echo ""
echo -e "3.  ${CYAN}Inicializa tu Base de Datos:${NC}"
echo -e "    - Conéctate a tu base de datos de Render usando un cliente de SQL (como DBeaver, TablePlus o psql)."
echo -e "    - Copia el contenido del archivo ${GREEN}src/lib/db/schema.sql${NC} y ejecútalo para crear las tablas."
echo ""
echo -e "\nHas establecido los cimientos para una aplicación multiusuario robusta. ¡Excelente progreso!"