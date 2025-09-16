'use client';
import React, { useState, useEffect } from 'react';

const plans = [
  // ... tu plan gratuito
  {
    name: 'Plan Premium',
    price: '9.999',
    priceId: 'pri_01k59kbft7tnw1vyw7ty453nrr', // REEMPLAZAR con tu Price ID de Paddle
    features: [
      'Todo lo del Plan Gratuito',
      'Builds y Runas Adaptativas',
      'Consejos Estratégicos en Vivo',
      'Análisis Post-Partida Detallado',
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

  const handleCheckout = async (priceId) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      const { checkoutUrl } = await response.json();
      if (checkoutUrl) {
        // Redirigir al usuario al checkout de Paddle
        window.location.href = checkoutUrl;
      }
    } catch (error) {
      console.error('Error al iniciar el checkout:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-12">
      <h2 className="text-4xl font-display font-bold text-center text-lol-gold mb-12">Elige Tu Arsenal</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 justify-center">
        {/* Aquí puedes mapear tu plan gratuito si lo deseas */}
        {plans.map((plan) => (
          plan.priceId && (
            <div key={plan.name} className={`bg-lol-blue-medium p-8 border-2 ${plan.isPopular ? 'border-lol-blue-accent' : 'border-lol-gold-dark'} rounded-lg flex flex-col`}>
              {plan.isPopular && <span className="text-center bg-lol-blue-accent text-lol-blue-dark font-bold py-1 px-4 rounded-full self-center -mt-12 mb-4">Más Popular</span>}
              <h3 className="text-3xl font-display font-bold text-center mb-4">{plan.name}</h3>
              <div className="text-center mb-6">
                <span className="text-5xl font-bold">${plan.price}</span>
                <span className="text-lol-gold-light/70">/mes</span>
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
                onClick={() => handleCheckout(plan.priceId)}
                disabled={isLoading}
                className={`w-full py-3 font-display font-bold rounded-lg transition-colors ${plan.isPopular ? 'bg-lol-blue-accent text-lol-blue-dark hover:bg-cyan-500' : 'bg-lol-gold text-lol-blue-dark hover:bg-yellow-600'} disabled:opacity-50`}
              >
                {isLoading ? 'Cargando...' : plan.cta}
              </button>
            </div>
          )
        ))}
      </div>
    </div>
  );
}