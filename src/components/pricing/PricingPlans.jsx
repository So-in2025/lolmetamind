'use client';
import React, { useState } from 'react';

const plans = [
  // ... (tu plan gratuito)
  {
    name: 'Plan Premium',
    price: '9.99', // Display price
    productData: {
      amount: 3500, // Precio real en ARS
      description: 'Suscripción Mensual LoL MetaMind Premium'
    },
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

const PAYU_URL = 'https://sandbox.checkout.payulatam.com/ppp-web-gateway-payu/'; // URL de Sandbox para pruebas

export default function PricingPlans() {
  const [formData, setFormData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async (productData) => {
    setIsLoading(true);
    const referenceCode = `LMM-PREMIUM-${Date.now()}`; // Genera una referencia única

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...productData, referenceCode }),
      });
      const data = await response.json();
      setFormData(data);
      // El formulario se enviará automáticamente al estado de actualización
    } catch (error) {
      console.error('Error al preparar el checkout:', error);
      setIsLoading(false);
    }
  };
  
  // Si tenemos los datos del formulario, lo renderizamos y lo enviamos
  if (formData) {
    return (
      <form id="payu-form" action={PAYU_URL} method="post">
        {Object.keys(formData).map(key => (
          <input key={key} name={key} type="hidden" value={formData[key]} />
        ))}
        <div className="text-center p-8">
          <p className="text-xl animate-pulse">Redirigiendo a la pasarela de pago segura de PayU...</p>
          <script>
            setTimeout(() => document.getElementById('payu-form').submit(), 100);
          </script>
        </div>
      </form>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-12">
      <h2 className="text-4xl font-display font-bold text-center text-lol-gold mb-12">Elige Tu Arsenal</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 justify-center">
        {/* Aquí puedes mapear tu plan gratuito si lo deseas */}
        {plans.map((plan) => (
          plan.productData && (
            <div key={plan.name} className={\`bg-lol-blue-medium p-8 border-2 \${plan.isPopular ? 'border-lol-blue-accent' : 'border-lol-gold-dark'} rounded-lg flex flex-col\`}>
              {plan.isPopular && <span className="text-center bg-lol-blue-accent text-lol-blue-dark font-bold py-1 px-4 rounded-full self-center -mt-12 mb-4">Más Popular</span>}
              <h3 className="text-3xl font-display font-bold text-center mb-4">{plan.name}</h3>
              <div className="text-center mb-6">
                <span className="text-5xl font-bold">\${plan.price}</span>
                <span className="text-lol-gold-light/70">/mes (USD aprox)</span>
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
                onClick={() => handleCheckout(plan.productData)}
                disabled={isLoading}
                className={\`w-full py-3 font-display font-bold rounded-lg transition-colors \${plan.isPopular ? 'bg-lol-blue-accent text-lol-blue-dark hover:bg-cyan-500' : 'bg-lol-gold text-lol-blue-dark hover:bg-yellow-600'} disabled:opacity-50\`}
              >
                {isLoading ? 'Preparando...' : plan.cta}
              </button>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
