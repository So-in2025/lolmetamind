#!/bin/bash

# ==============================================================================
# SCRIPT DE AUTOMATIZACIÓN PARA LA FASE 5 DE LOL METAMIND
#
# Rol: Arquitecto de Backend y Frontend
# Objetivo: Implementar la infraestructura para la monetización (Planes Premium).
# ==============================================================================

# --- Colores para la salida ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Iniciando script para Fase 5: Monetización y Expansión...${NC}"

# --- 1. Instalación de Dependencias de Stripe ---
echo -e "\n${GREEN}Paso 1: Instalando dependencias de Stripe...${NC}"
npm install stripe @stripe/stripe-js
echo -e "${GREEN}Dependencias de Stripe instaladas.${NC}"

# --- 2. Creación de la Lógica y Componentes de Monetización ---
echo -e "\n${GREEN}Paso 2: Creando estructura para precios y checkout...${NC}"

mkdir -p src/components/pricing
touch src/components/pricing/PricingPlans.jsx

mkdir -p src/app/api/checkout
touch src/app/api/checkout/route.js

mkdir -p src/lib/stripe
touch src/lib/stripe/index.js

# Crear el componente de UI para los planes de precios
cat << 'EOF' > src/components/pricing/PricingPlans.jsx
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
EOF

# Crear la configuración del cliente de Stripe
cat << 'EOF' > src/lib/stripe/index.js
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16', // Usa una versión reciente de la API
});
EOF

# Crear la ruta de API para el checkout
cat << 'EOF' > src/app/api/checkout/route.js
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(request) {
  const { priceId } = await request.json();

  if (!priceId) {
    return NextResponse.json({ error: 'Price ID es requerido' }, { status: 400 });
  }

  const YOUR_DOMAIN = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${YOUR_DOMAIN}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${YOUR_DOMAIN}/`,
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creando sesión de Stripe:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
EOF

# --- 3. Actualización de la Página Principal ---
echo -e "\n${GREEN}Paso 3: Integrando el componente de precios en la página principal...${NC}"
cat << 'EOF' > src/app/page.jsx
import ProfileForm from '@/components/forms/ProfileForm'
import PricingPlans from '@/components/pricing/PricingPlans'
import Link from 'next/link';

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
      
      {/* Aquí puedes poner el formulario de registro/login que creamos en la Fase 4 */}
      
      <PricingPlans />

    </main>
  );
}
EOF

# --- 4. Preparación de Variables de Entorno y Base de Datos ---
echo -e "\n${GREEN}Paso 4: Preparando .env.local y mostrando script SQL para la base de datos...${NC}"
{
  echo ""
  echo "# ================================================"
  echo "# VARIABLES PARA LA FASE 5: MONETIZACIÓN (STRIPE)"
  echo "# ================================================"
  echo "# Claves obtenidas de tu Dashboard de Stripe"
  echo "STRIPE_SECRET_KEY=\"sk_test_...\""
  echo "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=\"pk_test_...\""
  echo ""
  echo "# URL de tu aplicación en producción (Vercel)"
  echo "NEXT_PUBLIC_APP_URL=\"https://tu-proyecto.vercel.app\""
} >> .env.local

echo -e "\n${CYAN}----------------------------------------------------------------------"
echo -e "ACCIÓN MANUAL REQUERIDA PARA LA BASE DE DATOS:"
echo -e "Ejecuta el siguiente comando SQL en DBeaver para actualizar tu tabla 'users'."
echo -e "Esto añadirá los campos necesarios para gestionar las suscripciones."
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\nALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(255) UNIQUE;"
echo -e "ALTER TABLE users ADD COLUMN subscription_status VARCHAR(50) DEFAULT 'free';"
echo -e "ALTER TABLE users ADD COLUMN subscription_id VARCHAR(255) UNIQUE;"
echo -e "\n"

echo -e "${YELLOW}----------------------------------------------------------------------"
echo -e "¡La preparación para la Fase 5 ha finalizado! 💸"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Tus próximos pasos son:${NC}"
echo -e "1.  Crea una cuenta en ${GREEN}Stripe.com${NC}."
echo -e "2.  Crea un producto (ej: 'Suscripción MetaMind Premium') en tu Dashboard de Stripe y añádele un precio. Stripe te dará un ${GREEN}Price ID (ej: price_...)${NC}."
echo -e "3.  Obtén tus claves API de Stripe (Publishable y Secret) del Dashboard."
echo -e "4.  Abre ${GREEN}.env.local${NC} y rellena las variables de Stripe. No olvides el Price ID en el componente ${GREEN}PricingPlans.jsx${NC}."
echo -e "5.  Ejecuta el script SQL de arriba en DBeaver."
echo -e "\nHas construido la base para el modelo de negocio de tu aplicación. ¡Gran avance!"