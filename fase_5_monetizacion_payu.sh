#!/bin/bash

# ====================================================================================
# SCRIPT DE PIVOTE FINAL PARA LA FASE 5 DE LOL METAMIND - IMPLEMENTANDO PAYU
#
# Rol: Arquitecto de Software
# Objetivo: Implementar una solución de pagos robusta y definitiva para LATAM.
# ====================================================================================

# --- Colores para la salida ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Iniciando el pivote final a PayU para la Fase 5...${NC}"

# --- 1. Limpieza de Dependencias Anteriores ---
echo -e "\n${RED}Paso 1: Desinstalando dependencias de Mercado Pago...${NC}"
npm uninstall mercadopago
# El script anterior ya debería haber quitado stripe, pero lo aseguramos
npm uninstall stripe @stripe/stripe-js 2>/dev/null || true
echo -e "${RED}Dependencias de pasarelas anteriores eliminadas.${NC}"

# --- 2. Instalación de Dependencias Necesarias ---
echo -e "\n${GREEN}Paso 2: Instalando crypto para la firma de PayU...${NC}"
# Crypto ya viene con Node.js, solo nos aseguramos de que no haya conflictos.
echo -e "${GREEN}Módulo 'crypto' es nativo de Node.js. No se necesita instalación.${NC}"

# --- 3. Actualización de la Lógica y Componentes ---
echo -e "\n${GREEN}Paso 3: Reemplazando archivos para la integración con PayU...${NC}"

# Eliminar directorios de configuraciones anteriores
rm -rf src/lib/mercadopago src/lib/stripe 2>/dev/null || true
echo "Limpiando configuraciones antiguas..."

# Reemplazar la API de Checkout para que genere la firma de PayU
cat << 'EOF' > src/app/api/checkout/route.js
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request) {
  const { amount, referenceCode, description } = await request.json();

  const apiKey = process.env.PAYU_API_KEY;
  const merchantId = process.env.NEXT_PUBLIC_PAYU_MERCHANT_ID;
  const accountId = process.env.PAYU_ACCOUNT_ID;
  const currency = 'ARS'; // O la moneda que corresponda

  if (!apiKey || !merchantId || !accountId) {
    return NextResponse.json({ error: 'Variables de entorno de PayU no configuradas' }, { status: 500 });
  }

  // Creación de la firma de seguridad (muy importante para PayU)
  const signatureString = `${apiKey}~${merchantId}~${referenceCode}~${amount}~${currency}`;
  const signature = crypto.createHash('md5').update(signatureString).digest('hex');

  const formData = {
    merchantId,
    accountId,
    description,
    referenceCode,
    amount,
    tax: 0,
    taxReturnBase: 0,
    currency,
    signature,
    test: process.env.NODE_ENV === 'development' ? '1' : '0', // 1 para pruebas, 0 para producción
    responseUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    confirmationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/confirmation`,
  };

  return NextResponse.json(formData);
}
EOF
echo "Actualizado: src/app/api/checkout/route.js con lógica de PayU"

# Reemplazar el componente de Precios para que genere un formulario dinámico
cat << 'EOF' > src/components/pricing/PricingPlans.jsx
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
EOF
echo "Actualizado: src/components/pricing/PricingPlans.jsx para PayU"

# --- 4. Actualización de Variables de Entorno ---
echo -e "\n${GREEN}Paso 4: Limpiando y preparando .env.local para PayU...${NC}"
# Eliminar las líneas de Mercado Pago
sed -i '/MERCADOPAGO_ACCESS_TOKEN/d' .env.local
sed -i '/NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY/d' .env.local

# Añadir las nuevas variables para PayU
{
  echo ""
  echo "# ================================================"
  echo "# VARIABLES PARA LA FASE 5 (Final): MONETIZACIÓN (PayU)"
  echo "# ================================================"
  echo "# Credenciales obtenidas de tu Módulo PayU"
  echo "PAYU_API_KEY=\"xxxxxxxxxxxx\""
  echo "NEXT_PUBLIC_PAYU_MERCHANT_ID=\"xxxxxx\""
  echo "PAYU_ACCOUNT_ID=\"xxxxxx\""
} >> .env.local


echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡Pivote final a PayU completado! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Tus próximos pasos son:${NC}"
echo -e "1.  Crea una cuenta en ${GREEN}PayU Latam${NC} (asegúrate de que sea la versión para Latinoamérica)."
echo -e "2.  En tu panel de PayU, ve a la configuración técnica. Necesitarás obtener:"
echo -e "    - ${GREEN}API Key${NC}"
echo -e "    - ${GREEN}Merchant ID${NC}"
echo -e "    - ${GREEN}Account ID${NC}"
echo -e "3.  Abre ${GREEN}.env.local${NC} y rellena las nuevas variables de PayU."
echo -e "4.  Añade estas mismas variables de entorno en ${GREEN}Vercel${NC}."
echo -e "5.  Recuerda que el `PAYU_URL` en el componente es para el entorno de pruebas (sandbox). Para producción, deberás cambiarlo a la URL real que te proporcione PayU."
echo -e "\n¡Ahora tienes una solución de pagos sólida y lista para toda Latinoamérica!"