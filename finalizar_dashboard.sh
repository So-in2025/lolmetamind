#!/bin/bash

# ==============================================================================
# SCRIPT DE RESTAURACIÓN Y FINALIZACIÓN DE LA FASE 6
#
# Rol: Arquitecto de Frontend
# Objetivo: Restaurar el contenido original de la app y moverlo a la ruta
#           correcta del dashboard (/dashboard/page.jsx).
# ==============================================================================

# --- Colores para la salida ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Iniciando la restauración del contenido principal en el Dashboard...${NC}"

# --- 1. Creación de la Estructura de Archivos del Dashboard si no existe ---
echo -e "\n${GREEN}Paso 1: Asegurando la estructura de directorios para /dashboard...${NC}"
mkdir -p src/app/dashboard

# --- 2. Creación del Layout y la Página del Dashboard ---
echo -e "\n${GREEN}Paso 2: Creando los archivos layout.jsx y page.jsx del dashboard...${NC}"

# Crear el Layout principal para la sección del dashboard
cat << 'EOF' > src/app/dashboard/layout.jsx
// src/app/dashboard/layout.jsx

export default function DashboardLayout({ children }) {
  return (
    <section className="min-h-screen w-full bg-lol-blue-dark text-lol-gold-light font-body">
      <header className="bg-lol-blue-medium p-4 border-b-2 border-lol-gold-dark">
        <h1 className="text-2xl font-display text-lol-gold text-center">
          LoL MetaMind Dashboard
        </h1>
      </header>
      <main className="p-4 sm:p-8">
        {children}
      </main>
    </section>
  );
}
EOF
echo "Creado: src/app/dashboard/layout.jsx"

# Crear la Página principal del Dashboard con todo el contenido original
cat << 'EOF' > src/app/dashboard/page.jsx
import ProfileForm from '@/components/forms/ProfileForm'
import WeeklyChallenges from '@/components/WeeklyChallenges'
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-12">

      {/* Columna de la izquierda: Formulario y Contenido Principal */}
      <div className="w-full lg:w-1/2 flex flex-col items-center">
        <div className="w-full max-w-lg mb-8 text-center lg:text-left">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-lol-blue-accent mb-4 text-shadow-lg">
              Tu Centro de Mando
            </h2>
            <p className="text-lg md:text-xl text-lol-gold-light/90">
              Usa el formulario para obtener un análisis instantáneo o revisa tus retos semanales.
            </p>
        </div>
        <div className="w-full max-w-lg">
          <ProfileForm />
        </div>
      </div>

      {/* Columna de la derecha: Módulos adicionales como Gamificación */}
      <div className="w-full lg:w-1/2 flex flex-col items-center mt-0 lg:mt-24">
        <div className="w-full max-w-lg">
          <WeeklyChallenges />
          <div className="mt-8 text-center bg-lol-blue-medium p-6 rounded-xl shadow-lg border-2 border-lol-gold-dark">
            <h3 className="text-xl font-display font-bold text-lol-gold mb-2">Para Streamers</h3>
            <Link href="/overlay" className="text-lol-blue-accent hover:text-lol-gold transition-colors duration-300" target="_blank">
              Abrir el widget de OBS en una nueva pestaña »
            </Link>
          </div>
        </div>
      </div>
      
    </div>
  );
}
EOF
echo "src/app/dashboard/page.jsx ha sido creado con el contenido principal de la aplicación."


echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡La estructura del proyecto ha sido corregida y finalizada! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Resumen de la estructura actual:${NC}"
echo -e "1.  La página de inicio (${GREEN}/${NC}) es tu landing page con los planes de precios."
echo -e "2.  El botón 'Empezar Gratis' ahora te llevará a ${GREEN}/dashboard${NC}."
echo -e "3.  La página ${GREEN}/dashboard${NC} ahora contiene el corazón de tu aplicación: el formulario, los retos y todo lo que tenías antes."
echo -e "\nSube estos cambios a GitHub y todo funcionará como esperas."