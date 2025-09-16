#!/bin/bash

# ====================================================================================
# SCRIPT DE PIVOTE FINAL PARA FASE 5 - IMPLEMENTANDO PADDLE (MERCHANT OF RECORD)
#
# Rol: Arquitecto de Software
# Objetivo: Implementar una solución de pagos global que elimina barreras de registro.
# ====================================================================================

# --- Colores para la salida ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Iniciando configuración final con Paddle para la Fase 5...${NC}"

# --- 1. Limpieza de Dependencias Anteriores ---
echo -e "\n${RED}Paso 1: Desinstalando dependencias de pasarelas anteriores...${NC}"
npm uninstall mercadopago stripe @stripe/stripe-js payu 2>/dev/null || true
echo -e "${RED}Dependencias de pasarelas anteriores eliminadas.${NC}"

# --- 2. Instalación de Dependencias de Paddle ---
echo -e "\n${GREEN}Paso 2: Instalando el SDK de Paddle...${NC}"
npm install @paddle/paddle-node-sdk
echo -e "${GREEN}SDK de Paddle instalado.${NC}"

# --- 3. Actualización de la Lógica y Componentes ---
echo -e "\n${GREEN}Paso 3: Reemplazando archivos para la integración con Paddle...${NC}"

# Eliminar directorios de configuraciones anteriores
rm -rf src/lib/mercadopago src/lib/stripe src/lib/payu 2>/dev/null || true
echo "Limpiando configuraciones antiguas..."

# Crear la nueva configuración para Paddle
mkdir -p src/lib/paddle
touch src/lib/paddle/index.js
cat << 'EOF' > src/lib/paddle/index.js
import { Paddle } from '@paddle/paddle-node-sdk';

// Inicializa el SDK de Paddle con tu clave de API
// El SDK leerá la variable de entorno PADDLE_API_KEY automáticamente.
export const paddle = new Paddle();
EOF
echo "Creado: src/lib/paddle/index.js"

# Reemplazar la API de Checkout
cat << 'EOF' > src/app/api/checkout/route.js
import { NextResponse } from 'next/server';
import { paddle } from '@/lib/paddle';

export async function POST(request) {
  const { priceId } = await request.json();

  if (!priceId) {
    return NextResponse.json({ error: 'Price ID es requerido' }, { status: 400 });
  }

  try {
    // Crear un link de pago para una suscripción
    const transaction = await paddle.transactions.create({
      items: [{ priceId: priceId, quantity: 1 }],
      // Opcional: puedes asociar el checkout a un cliente si ya está registrado
      // customer_id: 'cus_xxxxxxxx',
      customData: {
        // Aquí puedes pasar datos adicionales que necesites
        userId: 'usr_12345', // Ejemplo
      }
    });

    return NextResponse.json({ checkoutUrl: transaction.checkout.url });

  } catch (error) {
    console.error('Error creando transacción de Paddle:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
EOF
echo "Actualizado: src/app/api/checkout/route.js con lógica de Paddle"

# Reemplazar el componente de Precios
cat << 'EOF' > src/components/pricing/PricingPlans.jsx
'use client';
import React, { useState, useEffect } from 'react';

const plans = [
  // ... tu plan gratuito
  {
    name: 'Plan Premium',
    price: '9.99',
    priceId: 'pri_01j7b1a0b2c3d4e5f6g7h8i9j0', // REEMPLAZAR con tu Price ID de Paddle
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
            <div key={plan.name} className={\`bg-lol-blue-medium p-8 border-2 \${plan.isPopular ? 'border-lol-blue-accent' : 'border-lol-gold-dark'} rounded-lg flex flex-col\`}>
              {plan.isPopular && <span className="text-center bg-lol-blue-accent text-lol-blue-dark font-bold py-1 px-4 rounded-full self-center -mt-12 mb-4">Más Popular</span>}
              <h3 className="text-3xl font-display font-bold text-center mb-4">{plan.name}</h3>
              <div className="text-center mb-6">
                <span className="text-5xl font-bold">\${plan.price}</span>
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
                className={\`w-full py-3 font-display font-bold rounded-lg transition-colors \${plan.isPopular ? 'bg-lol-blue-accent text-lol-blue-dark hover:bg-cyan-500' : 'bg-lol-gold text-lol-blue-dark hover:bg-yellow-600'} disabled:opacity-50\`}
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
EOF
echo "Actualizado: src/components/pricing/PricingPlans.jsx para Paddle"

# --- 4. Actualización de Variables de Entorno ---
echo -e "\n${GREEN}Paso 4: Limpiando y preparando .env.local para Paddle...${NC}"
# Eliminar las líneas de pasarelas anteriores
sed -i '/MERCADOPAGO_ACCESS_TOKEN/d' .env.local
sed -i '/NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY/d' .env.local
sed -i '/PAYU_API_KEY/d' .env.local
sed -i '/NEXT_PUBLIC_PAYU_MERCHANT_ID/d' .env.local
sed -i '/PAYU_ACCOUNT_ID/d' .env.local
sed -i '/STRIPE_SECRET_KEY/d' .env.local
sed -i '/NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY/d' .env.local

# Añadir las nuevas variables para Paddle
{
  echo ""
  echo "# ================================================"
  echo "# VARIABLES PARA LA FASE 5 (Final): MONETIZACIÓN (PADDLE)"
  echo "# ================================================"
  echo "# Claves obtenidas de tu Dashboard de Paddle"
  echo "PADDLE_API_KEY=\"\""
} >> .env.local

echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡Configuración de Paddle lista para usar! 🚀"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Tus próximos pasos son:${NC}"
echo -e "1.  Abre ${GREEN}.env.local${NC} y pega tu ${GREEN}API Key de Paddle${NC}."
echo -e "2.  Abre ${GREEN}src/components/pricing/PricingPlans.jsx${NC} y reemplaza el Price ID de ejemplo ('pri_...') con el que creaste en tu dashboard de Paddle."
echo -e "3.  Sube estas mismas variables a la configuración de entorno en ${GREEN}Vercel${NC}."
echo -e "4.  ¡Haz un commit y deploy de tus cambios! Tu sistema de pagos estará 100% funcional."