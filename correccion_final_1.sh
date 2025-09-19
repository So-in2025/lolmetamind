#!/bin/bash

# ==============================================================================
# SCRIPT DE CORRECCIÓN FINAL - LÓGICA DE USUARIO Y BASE DE DATOS
#
# Rol: Full-Stack Engineer
# Objetivo: 1. Solucionar el error "Usuario no encontrado en nuestra base de datos".
#           2. Eliminar los datos de prueba (mock) del frontend.
#           3. Crear un endpoint para obtener los datos del usuario real.
#           4. Asegurar que la conexión a la base de datos sea compatible con Vercel.
# ==============================================================================

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Aplicando la corrección final para el flujo de usuario y base de datos...${NC}"

# --- 1. Simplificar la conexión a la DB para Vercel ---
echo -e "\n${GREEN}Paso 1: Corrigiendo 'src/lib/db/index.js' para máxima compatibilidad con Vercel...${NC}"
cat << 'EOF' > src/lib/db/index.js
// src/lib/db/index.js
import { Pool } from 'pg';

let pool;

// Esta configuración es la recomendada para Vercel.
// Vercel maneja el SSL automáticamente a través de la connection string.
if (!global._pool) {
  global._pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
}
pool = global._pool;

export default pool;
EOF
echo "Actualizado: src/lib/db/index.js"


# --- 2. Crear un nuevo endpoint para obtener los datos del usuario autenticado ---
echo -e "\n${GREEN}Paso 2: Creando la API en 'src/app/api/user/me/route.js'...${NC}"
mkdir -p src/app/api/user/me
cat << 'EOF' > src/app/api/user/me/route.js
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const result = await pool.query('SELECT id, username, email, riot_id_name, riot_id_tagline, region FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);

  } catch (error) {
    console.error('Error al obtener datos del usuario:', error);
    return NextResponse.json({ error: 'Token inválido o error del servidor' }, { status: 500 });
  }
}
EOF
echo "Creado: src/app/api/user/me/route.js"


# --- 3. Corregir el layout del Dashboard para que use datos reales ---
echo -e "\n${GREEN}Paso 3: Eliminando datos 'mock' de 'src/app/dashboard/layout.jsx'...${NC}"
cat << 'EOF' > src/app/dashboard/layout.jsx
'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

function UserProfile() {
    const auth = useAuth();
    const router = useRouter();

    const handleLogout = () => {
        auth.logout();
        router.push('/login');
    };

    if (!auth || !auth.user) return null;

    return (
        <div className="flex items-center space-x-4">
            <span className="text-lol-gold-light">Bienvenido, <strong className="font-bold text-lol-blue-accent">{auth.user.username}</strong></span>
            <button
                onClick={handleLogout}
                className="bg-lol-gold-dark hover:bg-red-700 text-white text-xs font-bold py-1 px-3 rounded-lg"
            >
                Salir
            </button>
        </div>
    );
}

export default function DashboardLayout({ children }) {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    const processLogin = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tokenFromUrl = urlParams.get('token');

      if (tokenFromUrl && !auth.isAuthenticated) {
        console.log('Token encontrado en la URL. Obteniendo datos reales del usuario...');
        try {
          const response = await fetch('/api/user/me', {
            headers: { 'Authorization': `Bearer ${tokenFromUrl}` }
          });
          if (!response.ok) throw new Error('No se pudo verificar el token');
          
          const userData = await response.json();
          auth.login(userData, tokenFromUrl);
          router.replace('/dashboard', undefined, { shallow: true });
        } catch (error) {
          console.error("Error al iniciar sesión con token:", error);
          auth.logout();
          router.push('/login');
        }
      } else if (!auth.isAuthenticated) {
        router.push('/login');
      }
    };

    if (!auth.loading) {
      processLogin();
    }
  }, [auth, router]);

  if (auth.loading || !auth.isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-lol-blue-dark text-lol-gold-light flex items-center justify-center">
        <p className="animate-pulse">Verificando sesión...</p>
      </div>
    );
  }

  return (
    <section className="min-h-screen w-full bg-lol-blue-dark text-lol-gold-light font-body">
      <header className="bg-lol-blue-medium p-4 border-b-2 border-lol-gold-dark flex justify-between items-center">
        <h1 className="text-2xl font-display text-lol-gold text-center">
          LoL MetaMind Dashboard
        </h1>
        <UserProfile />
      </header>
      <main className="p-4 sm:p-8">
        {children}
      </main>
    </section>
  );
}
EOF
echo "Actualizado: src/app/dashboard/layout.jsx"


echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡SOLUCIÓN FINAL APLICADA! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Resumen de Cambios:${NC}"
echo -e "1.  **Base de Datos Corregida:** La conexión a la DB ahora es 100% compatible con Vercel. Esto debería asegurar que tu usuario se cree correctamente al iniciar sesión con Google."
echo -e "2.  **Lógica de Frontend Reparada:** Se eliminaron los datos de prueba. Después del login, la app ahora pide los datos reales del usuario al backend, asegurando que el ID sea el correcto."
echo -e "3.  **Experiencia de Usuario:** El saludo 'Bienvenido, Usuario Google' será reemplazado por el nombre real del usuario."
echo -e "\n**Acción Final:**"
echo -e "1.  **Cierra sesión** en la aplicación para limpiar los datos de prueba."
echo -e "2.  **Sube los cambios** a tu repositorio: \`git add . && git commit -m \"fix: Corregir flujo de autenticación y datos de usuario\" && git push\`"
echo -e "3.  Una vez que Vercel termine de desplegar, **inicia sesión de nuevo con Google**. El error debería haber desaparecido y podrás vincular tu cuenta."