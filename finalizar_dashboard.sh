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

# --- 1. Definir el contenido correcto para el Dashboard ---
echo -e "\n${GREEN}Paso 1: Escribiendo el contenido completo en src/app/dashboard/page.jsx...${NC}"

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
echo "src/app/dashboard/page.jsx ha sido actualizado con el contenido principal de la aplicación."

# --- 2. Asegurar que la página principal (/) solo muestre los planes ---
echo -e "\n${GREEN}Paso 2: Confirmando que la página de inicio (/) sea la de precios...${NC}"

cat << 'EOF' > src/app/page.jsx
import PricingPlans from '@/components/pricing/PricingPlans'

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

    </main>
  );
}
EOF
echo "src/app/page.jsx confirmado como página de precios."

echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡La estructura del proyecto ha sido corregida y finalizada! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Resumen de la estructura actual:${NC}"
echo -e "1.  La página de inicio (${GREEN}/${NC}) ahora es tu landing page con los planes de precios."
echo -e "2.  El botón 'Empezar Gratis' te lleva correctamente a ${GREEN}/dashboard${NC}."
echo -e "3.  La página ${GREEN}/dashboard${NC} ahora contiene el corazón de tu aplicación: el formulario, los retos y todo lo que tenías antes."
echo -e "\nSube estos cambios a GitHub y todo funcionará como esperas."