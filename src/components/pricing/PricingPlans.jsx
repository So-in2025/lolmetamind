'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';

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
      // Novedad: Redirigir a Google Auth con la URL final del dashboard
      window.location.href = '/api/auth/google?redirect_to=/dashboard';
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
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center p-4">
      <h2 className="text-4xl font-display font-bold text-center text-lol-gold mb-12">Elige Tu Arsenal</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto max-h-full">
        {plans.map((plan) => (
          <motion.div 
            key={plan.name} 
            className={'bg-lol-blue-medium p-4 md:p-6 border-2 ' + (plan.isPopular ? 'border-lol-blue-accent' : 'border-lol-gold-dark') + ' rounded-lg flex flex-col justify-between'}
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
          >
            {plan.isPopular && <span className="text-center bg-lol-blue-accent text-lol-blue-dark font-bold py-1 px-4 rounded-full self-center -mt-12 mb-4">Más Popular</span>}
            <div className="text-center mb-4">
              <h3 className="text-2xl font-display font-bold mb-2">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-lol-gold-light/70 text-sm">{plan.price !== '0' ? '/mes' : ''}</span>
              </div>
            </div>
            <ul className="space-y-2 mb-6 text-sm flex-grow">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center">
                  <svg className="w-4 h-4 text-green-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => handlePlanClick(plan)}
              disabled={isLoading && plan.priceId}
              className={'w-full py-2 font-display font-bold rounded-lg transition-colors ' + (plan.isPopular ? 'bg-lol-blue-accent text-lol-blue-dark hover:bg-cyan-500' : 'bg-lol-gold text-lol-blue-dark hover:bg-yellow-600') + ' disabled:opacity-50'}
            >
              {isLoading && plan.priceId ? 'Cargando...' : plan.cta}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}