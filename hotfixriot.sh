#!/bin/bash

# ==============================================================================
# SCRIPT DE CORRECCIÓN FINAL - CONFIGURACIÓN DE GOOGLE AUTH
#
# Rol: DevOps Engineer
# Objetivo: 1. Corregir el esquema de la base de datos para Google Auth.
#           2. Actualizar la configuración de la base de datos.
#           3. Reconstruir los archivos del frontend para el flujo de autenticación de Google.
# ==============================================================================

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Aplicando correcciones finales para la autenticación de Google...${NC}"

# --- 1. Reconstruir el esquema de la base de datos ---
echo -e "\n${GREEN}Paso 1: Reconstruyendo 'src/lib/db/schema.sql'...${NC}"
cat << 'EOF' > src/lib/db/schema.sql
-- src/lib/db/schema.sql
-- Esquema de base de datos para PostgreSQL en producción.

-- Se eliminan las tablas existentes para asegurar un esquema limpio.
DROP TABLE IF EXISTS users CASCADE;

-- Tabla de Usuarios actualizada para Riot ID y Paddle
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE,
    google_id VARCHAR(255) UNIQUE,
    
    -- Campos para el Riot ID y datos de League
    riot_id_name VARCHAR(255),
    riot_id_tagline VARCHAR(10),
    region VARCHAR(10),
    puuid VARCHAR(255) UNIQUE,
    summoner_id VARCHAR(255) UNIQUE,

    -- Campos para monetización con Paddle
    plan_status VARCHAR(50) DEFAULT 'free',
    paddle_customer_id VARCHAR(255) UNIQUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
EOF
echo -e "Esquema de base de datos reconstruido con el formato correcto. ✅"

# --- 2. Modificar la página principal para eliminar el LoginButtons suelto ---
echo -e "\n${GREEN}Paso 2: Modificando 'src/app/page.jsx'...${NC}"
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
echo "Actualizado: src/app/page.jsx. ✅"

# --- 3. Corregir el flujo de los botones de precio ---
echo -e "\n${GREEN}Paso 3: Modificando 'src/components/pricing/PricingPlans.jsx'...${NC}"
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
      window.location.href = '/api/auth/google';
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
echo "Actualizado: src/components/pricing/PricingPlans.jsx. ✅"

# --- 4. Corregir el endpoint de Google para manejar la redirección ---
echo -e "\n${GREEN}Paso 4: Modificando 'src/app/api/auth/google/route.js'...${NC}"
cat << 'EOF' > src/app/api/auth/google/route.js
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import pool from '@/lib/db';
import { createToken } from '@/lib/auth/utils';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const JWT_SECRET = process.env.JWT_SECRET;

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
      prompt: 'consent'
    });
    return NextResponse.redirect(authUrl);
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2'
    });
    const userInfo = await oauth2.userinfo.get();

    let user = null;
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [userInfo.data.email]);
    
    if (existingUser.rows.length > 0) {
      user = existingUser.rows[0];
    } else {
      const newUserResult = await pool.query(
        'INSERT INTO users (username, email, google_id) VALUES ($1, $2, $3) RETURNING *',
        [userInfo.data.name, userInfo.data.email, userInfo.data.id]
      );
      user = newUserResult.rows[0];
    }

    const token = createToken({ userId: user.id, username: user.username });
    
    const redirectUrl = new URL('/dashboard', url.origin);
    redirectUrl.searchParams.set('token', token);
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('Error al procesar el login de Google:', error);
    return NextResponse.json({ error: 'Hubo un error con la autenticación de Google.' }, { status: 500 });
  }
}
EOF
echo "Corregido: src/app/api/auth/google/route.js. ✅"

echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡CORRECCIÓN APLICADA! ✅"
echo -e "----------------------------------------------------------------------${NC}"

