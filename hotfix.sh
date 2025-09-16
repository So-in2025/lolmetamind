#!/bin/bash

# ==============================================================================
# SCRIPT DE CORRECCIÓN FINAL - MANEJO DE RENDERIZADO DEL LADO DEL CLIENTE
#
# Rol: Full-Stack Engineer
# Objetivo: 1. Solucionar el error de pre-renderizado (TypeError: Cannot destructure)
#              asegurando que los componentes que usan AuthContext manejen el
#              estado inicial nulo.
#           2. Eliminar la configuración de Babel conflictiva para restaurar
#              el compilador nativo de Next.js (SWC).
# ==============================================================================

# --- Colores para la salida ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Aplicando corrección de renderizado y build...${NC}"

# --- 1. Eliminar la configuración de Babel conflictiva ---
echo -e "\n${GREEN}Paso 1: Eliminando 'babel.config.js' para reactivar el compilador SWC de Next.js...${NC}"
rm -f babel.config.js babel.config.server.js .babelrc
echo "Archivos de configuración de Babel eliminados."

# --- 2. Corregir el layout del Dashboard para manejar el estado nulo ---
echo -e "\n${GREEN}Paso 2: Haciendo que 'src/app/dashboard/layout.jsx' sea robusto al pre-renderizado...${NC}"
cat << 'EOF' > src/app/dashboard/layout.jsx
// src/app/dashboard/layout.jsx
'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

function UserProfile() {
    // El hook useAuth ahora puede devolver null inicialmente
    const auth = useAuth();
    const router = useRouter();

    const handleLogout = () => {
        if (auth) {
            auth.logout();
            router.push('/login');
        }
    };

    // Si auth o auth.user no existen, no renderizamos nada
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

  // El useEffect solo se ejecuta en el cliente, por lo que auth ya estará definido
  useEffect(() => {
    if (auth && !auth.loading && !auth.isAuthenticated) {
      router.push('/login');
    }
  }, [auth, router]);

  // Durante el build o la carga inicial, auth puede ser null o estar cargando
  if (!auth || auth.loading || !auth.isAuthenticated) {
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

# --- 3. Corregir la página del Dashboard ---
echo -e "\n${GREEN}Paso 3: Haciendo que 'src/app/dashboard/page.jsx' sea robusto...${NC}"
cat << 'EOF' > src/app/dashboard/page.jsx
'use client';
import { useAuth } from '@/context/AuthContext';
import SummonerProfileForm from '@/components/forms/SummonerProfileForm';
import ProfileForm from '@/components/forms/ProfileForm';
import WeeklyChallenges from '@/components/WeeklyChallenges';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const auth = useAuth();
  const [currentUser, setCurrentUser] = useState(auth ? auth.user : null);

  useEffect(() => {
    if (auth) {
      setCurrentUser(auth.user);
    }
  }, [auth]);

  const handleProfileUpdate = (updatedUser) => {
    if (auth) {
      const token = localStorage.getItem('authToken');
      auth.login(updatedUser, token); // Actualiza el contexto global
    }
  };

  // Si el contexto aún no carga, no renderizamos nada para evitar el error
  if (!currentUser) {
    return null; // O un spinner de carga
  }

  const hasSummonerProfile = currentUser && currentUser.summoner_name;

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-12">
      <div className="w-full lg:w-2/3 flex flex-col items-center">
        {hasSummonerProfile ? (
          <>
            <div className="w-full max-w-lg mb-8 text-center lg:text-left">
              <h2 className="text-4xl md:text-5xl font-display font-bold text-lol-blue-accent mb-4">
                Tu Centro de Mando
              </h2>
              <p className="text-lg text-lol-gold-light/90">
                Usa el formulario para obtener un análisis instantáneo o revisa tus retos semanales.
              </p>
            </div>
            <div className="w-full max-w-lg">
              <ProfileForm />
            </div>
          </>
        ) : (
          <div className="w-full max-w-lg">
            <SummonerProfileForm onProfileUpdate={handleProfileUpdate} />
          </div>
        )}
      </div>
      <div className="w-full lg:w-1/3 flex flex-col items-center mt-0 lg:mt-12">
        <div className="w-full max-w-lg">
          <WeeklyChallenges />
          <div className="mt-8 text-center bg-lol-blue-medium p-6 rounded-xl shadow-lg border-2 border-lol-gold-dark">
            <h3 className="text-xl font-display font-bold text-lol-gold mb-2">Para Streamers</h3>
            <Link href="/overlay" className="text-lol-blue-accent hover:text-lol-gold" target="_blank">
              Abrir el widget de OBS »
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
EOF
echo "Actualizado: src/app/dashboard/page.jsx"

# --- 4. Corregir la página de Precios ---
echo -e "\n${GREEN}Paso 4: Haciendo que 'src/components/pricing/PricingPlans.jsx' sea robusto...${NC}"
cat << 'EOF' > src/components/pricing/PricingPlans.jsx
'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const plans = [
  {
    name: 'Plan Gratuito',
    price: '0',
    features: [
      'Recomendador de Campeón',
      'Runas Adaptativas',
      'Análisis Pre-Partida',
      'Perfil Zodiacal Básico',
      'Clips con marca de agua'
    ],
    cta: 'Empezar Gratis',
    isPopular: false
  },
  {
    name: 'Plan Premium',
    price: '6.99',
    priceId: 'price_1PQfEHFp5L5d2dZ3e6Y4L0T8',
    features: [
      'Todo lo del Plan Gratuito',
      'Builds Adaptativas',
      'Consejos Estratégicos en Vivo',
      'Análisis Post-Partida',
      'Overlays Inteligentes Animados',
      'Clips Ilimitados sin marca de agua',
      'TTS Pro en Overlay y Clips'
    ],
    cta: 'Volverse Premium',
    isPopular: true
  }
];

export default function PricingPlans() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const isAuthenticated = auth ? auth.isAuthenticated : false;

  const handlePlanClick = (plan) => {
    if (!isAuthenticated) {
      router.push('/register');
      return;
    }
    if (plan.priceId) {
      setIsLoading(true);
      handleCheckout(plan.priceId);
    } else {
      router.push('/dashboard');
    }
  };

  const handleCheckout = async (priceId) => {
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });
      const { checkoutUrl } = await response.json();
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        throw new Error('No se recibió la URL de checkout');
      }
    } catch (error) {
      console.error('Error al iniciar el checkout:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-12">
      <h2 className="text-4xl font-display font-bold text-center text-lol-gold mb-12">Elige Tu Arsenal</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {plans.map((plan) => (
          <div key={plan.name} className={'bg-lol-blue-medium p-8 border-2 ' + (plan.isPopular ? 'border-lol-blue-accent' : 'border-lol-gold-dark') + ' rounded-lg flex flex-col'}>
            {plan.isPopular && <span className="text-center bg-lol-blue-accent text-lol-blue-dark font-bold py-1 px-4 rounded-full self-center -mt-12 mb-4">Más Popular</span>}
            <h3 className="text-3xl font-display font-bold text-center mb-4">{plan.name}</h3>
            <div className="text-center mb-6">
              <span className="text-5xl font-bold">${plan.price}</span>
              <span className="text-lol-gold-light/70">{plan.price !== '0' ? '/mes' : ''}</span>
            </div>
            <ul className="space-y-3 mb-8 flex-grow">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center">
                  <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handlePlanClick(plan)}
              disabled={isLoading && plan.priceId}
              className={'w-full py-3 font-display font-bold rounded-lg transition-colors ' + (plan.isPopular ? 'bg-lol-blue-accent text-lol-blue-dark hover:bg-cyan-500' : 'bg-lol-gold text-lol-blue-dark hover:bg-yellow-600') + ' disabled:opacity-50'}
            >
              {isLoading && plan.priceId ? 'Cargando...' : plan.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
EOF
echo "Actualizado: src/components/pricing/PricingPlans.jsx"


echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡Corrección de Renderizado Aplicada! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Resumen de la Solución:${NC}"
echo -e "1.  **Se eliminó el `babel.config.js`:** Esto permite que Vercel/Next.js use su compilador nativo (SWC), que es mucho más rápido y no tiene conflictos."
echo -e "2.  **Se protegió el código contra valores nulos:** Los componentes ahora verifican si el contexto de autenticación (`auth`) existe antes de intentar usar sus propiedades (`user`, `isAuthenticated`). Esto soluciona el error de `prerendering`."
echo -e "\nAhora sí, ingeniero. Sube estos cambios. Con esto, Vercel debería compilar sin problemas. El servicio de Render para websockets no se ve afectado y debería seguir funcionando correctamente."