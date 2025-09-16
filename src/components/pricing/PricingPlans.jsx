'use client';
import { loadStripe } from '@stripe/stripe-js';

// Carga tu clave pública de Stripe desde las variables de entorno
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const plans = [
  {
    name: 'Plan Gratuito',
    price: '0',
    features: [
      'Recomendador de Campeón',
      'Análisis Pre-Partida Básico',
      'Perfil Zodiacal Básico',
      'Clips con marca de agua'
    ],
    cta: 'Empezar Gratis',
    isPopular: false
  },
  {
    name: 'Plan Premium',
    price: '9.99',
    priceId: 'price_xxxxxxxxxxxxxx', // REEMPLAZAR con tu Price ID de Stripe
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

const handleCheckout = async (priceId) => {
  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ priceId }),
    });

    const { sessionId } = await response.json();
    const stripe = await stripePromise;
    await stripe.redirectToCheckout({ sessionId });
  } catch (error) {
    console.error('Error al iniciar el checkout:', error);
  }
};

export default function PricingPlans() {
  return (
    <div className="w-full max-w-4xl mx-auto py-12">
      <h2 className="text-4xl font-display font-bold text-center text-lol-gold mb-12">Elige Tu Arsenal</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {plans.map((plan) => (
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
              onClick={() => plan.priceId && handleCheckout(plan.priceId)}
              className={`w-full py-3 font-display font-bold rounded-lg transition-colors ${plan.isPopular ? 'bg-lol-blue-accent text-lol-blue-dark hover:bg-cyan-500' : 'bg-lol-gold text-lol-blue-dark hover:bg-yellow-600'}`}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
