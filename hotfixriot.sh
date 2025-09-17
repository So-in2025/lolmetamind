#!/bin/bash

# ==============================================================================
# SCRIPT DE CORRECCIÓN FINAL - FLUJO GOOGLE AUTH
#
# Rol: Frontend Developer
# Objetivo: 1. Conectar el botón "Empezar Gratis" directamente a Google Auth.
#           2. Eliminar el botón de Twitch para un sistema de login exclusivo de Google.
# ==============================================================================

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Iniciando la corrección del flujo de Google Auth...${NC}"

# --- 1. Corregir el flujo del botón en PricingPlans ---
echo -e "\n${GREEN}Paso 1: Modificando 'src/components/pricing/PricingPlans.jsx'...${NC}"
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
    if (!isAuthenticated && plan.name === 'Plan Gratuito') {
      window.location.href = '/api/auth/google';
      return;
    }
    if (!isAuthenticated) {
      // Para planes de pago, si no está autenticado, podría redirigir a una página de registro/login
      // o a la página principal con el botón. Por ahora, lo dejamos así.
      alert("Por favor, inicia sesión para acceder al plan premium.");
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
echo "Corregido: src/components/pricing/PricingPlans.jsx. ✅"

# --- 2. Modificar el LoginButtons para que solo muestre Google ---
echo -e "\n${GREEN}Paso 2: Modificando 'src/components/auth/LoginButtons.jsx'...${NC}"
cat << 'EOF' > src/components/auth/LoginButtons.jsx
'use client';

import React from 'react';

export default function LoginButtons() {
  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
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
echo "Corregido: src/components/auth/LoginButtons.jsx. ✅"

echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡CORRECCIÓN APLICADA! ✅"
echo -e "----------------------------------------------------------------------${NC}"
