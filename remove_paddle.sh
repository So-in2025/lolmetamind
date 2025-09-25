#!/bin/bash

# =========================================================================================
# SCRIPT PARA ELIMINAR COMPLETAMENTE LA INTEGRACIÓN CON PADDLE
# NOTA: Debes ejecutar este script y luego seguir las 3 instrucciones finales.
# =========================================================================================

# !!! IMPORTANTE: Reemplaza esta URL con tu link real de checkout de Hotmart.
HOTMART_CHECKOUT_URL="https://pay.hotmart.com/XYZ" 

echo "--- 1. Eliminando archivos de ruta y librería de Paddle ---"
rm -f src/app/api/checkout/route.js
rm -f src/lib/paddle/index.js
rm -f dist/lib/paddle/index.js
echo "Archivos de Paddle eliminados con éxito."

# --- 2. Reescritura de package.json (Eliminar @paddle/paddle-node-sdk) ---
echo "--- 2. Actualizando package.json para eliminar dependencia de Paddle ---"
cat > so-in2025/lolmetamind/lolmetamind-abcac7c2cd0cf26310ac1645a768417f9d41a641/package.json << 'EOL'
{
  "name": "lol-metamind",
  "version": "0.1.0",
  "private": true,
  "main": "main.js",
  "build": {
    "appId": "com.lolmetamind.app"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "build:server": "rm -rf dist && babel --config-file ./babel.config.server.js src/lib --out-dir dist/lib && babel --config-file ./babel.config.server.js src/services --out-dir dist/services",
    "start:server": "npm run build:server && node websocket-server.js",
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:3000 && electron .\"",
    "electron:package": "npm run build && electron-builder"
  },
  "dependencies": {
    "@clerk/nextjs": "^6.32.2",
    "@tailwindcss/aspect-ratio": "^0.4.2",
    "autoprefixer": "^10.4.21",
    "axios": "^1.12.2",
    "bcryptjs": "^3.0.2",
    "concurrently": "^8.2.2",
    "dotenv": "^17.2.2",
    "electron": "^22.3.27",
    "electron-builder": "^23.6.0",
    "electron-is-dev": "^3.0.1",
    "fluent-ffmpeg": "^2.1.3",
    "framer-motion": "^12.23.18",
    "googleapis": "^160.0.0",
    "jsonwebtoken": "^9.0.2",
    "next": "^14.2.32",
    "pg": "^8.16.3",
    "react": "^18",
    "react-dom": "^18",
    "react-hook-form": "^7.52.0",
    "react-icons": "^5.5.0",
    "react-youtube": "^10.1.0",
    "tailwindcss": "^3.4.17",
    "tailwindcss-textshadow": "^2.1.3",
    "uuid": "^13.0.0",
    "wait-on": "^7.2.0",
    "ws": "^8.18.3"
  },
  "devDependencies": {
    "@babel/cli": "^7.24.7",
    "@babel/core": "^7.24.7",
    "@babel/preset-env": "^7.24.7",
    "@babel/preset-react": "^7.24.7",
    "babel-plugin-module-resolver": "^5.0.2",
    "eslint": "^8",
    "eslint-config-next": "14.2.4",
    "postcss": "^8.5.6"
  }
}
EOL
echo "package.json reescrito sin la dependencia de Paddle."

# --- 3. Reescritura de PricingPlans.jsx (Usar URL de Hotmart) ---
echo "--- 3. Actualizando PricingPlans.jsx para usar redirección directa a Hotmart ---"
cat > so-in2025/lolmetamind/lolmetamind-abcac7c2cd0cf26310ac1645a768417f9d41a641/src/components/pricing/PricingPlans.jsx << EOL
'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';

// !!! IMPORTANTE: REEMPLAZAR ESTA URL CON TU LINK REAL DE CHECKOUT DE HOTMART !!!
const HOTMART_CHECKOUT_URL = "${HOTMART_CHECKOUT_URL}"; 

const plans = [
  {
    name: 'Plan Gratuito',
    price: '0',
    features: [
      'Recomendador de Campeón',
      'Runas y Builds Adaptativas',
      'Análisis Pre-Partida',
      'Perfil Zodiacal Básico',
      'Clips con marca de agua'
    ],
    cta: 'Empezar Gratis',
    isPopular: false
  },
  {
    name: 'Plan Premium',
    price: '4.99',
    // Usamos hotmartUrl en lugar de priceId
    hotmartUrl: HOTMART_CHECKOUT_URL, 
    features: [
      'Todo lo del Plan Gratuito',
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
      window.location.href = '/api/auth/google?redirect_to=/dashboard';
      return;
    }
    
    // Redirección directa al checkout de Hotmart
    if (plan.hotmartUrl) {
      setIsLoading(true);
      window.location.href = plan.hotmartUrl;
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center">
      <h2 className="text-4xl font-display font-bold text-center text-lol-gold mb-8 md:mb-12">Elige Tu Arsenal</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-4">
        {plans.map((plan) => (
          <motion.div 
            key={plan.name} 
            className={'bg-lol-blue-medium p-4 md:p-6 border-2 ' + (plan.isPopular ? 'border-lol-blue-accent' : 'border-lol-gold-dark') + ' rounded-lg flex flex-col justify-between'}
            whileHover={{ scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
          >
            {plan.isPopular && <span className="text-center bg-lol-blue-accent text-lol-blue-dark font-bold py-1 px-4 rounded-full self-center -mt-12 mb-4 text-sm">Más Popular</span>}
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
              disabled={isLoading && plan.hotmartUrl}
              className={'w-full py-2 font-display font-bold rounded-lg transition-colors ' + (plan.isPopular ? 'bg-lol-blue-accent text-lol-blue-dark hover:bg-cyan-500' : 'bg-lol-gold text-lol-blue-dark hover:bg-yellow-600') + ' disabled:opacity-50'}
            >
              {isLoading && plan.hotmartUrl ? 'Redirigiendo...' : plan.cta}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
EOL
echo "src/components/pricing/PricingPlans.jsx actualizado."

# --- 4. Reescritura de schema.sql (Eliminar columna de Paddle) ---
echo "--- 4. Actualizando src/lib/db/schema.sql para eliminar la columna de Paddle ---"
cat > so-in2025/lolmetamind/lolmetamind-abcac7c2cd0cf26310ac1645a768417f9d41a641/src/lib/db/schema.sql << 'EOL'
-- src/lib/db/schema.sql
-- Esquema de base de datos para PostgreSQL en producción.

-- Se eliminan las tablas existentes para asegurar un esquema limpio.
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS user_challenges CASCADE;

-- Tabla de Usuarios actualizada para Riot ID y Hotmart
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE,
    google_id VARCHAR(255) UNIQUE,
    avatar_url VARCHAR(255),
    
    -- Campos para el Riot ID y datos de League
    riot_id_name VARCHAR(255),
    riot_id_tagline VARCHAR(10),
    region VARCHAR(10),
    puuid VARCHAR(255) UNIQUE,
    summoner_id VARCHAR(255) UNIQUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Campos para Hotmart y suscripción (USAMOS SOLO subscription_tier)
    subscription_tier VARCHAR(50) DEFAULT 'FREE',
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    license_key VARCHAR(255) UNIQUE,
    hotmart_subscription_id VARCHAR(255)
);

-- Tabla para almacenar los desafíos activos de los usuarios
CREATE TABLE user_challenges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    challenge_type VARCHAR(50) NOT NULL, -- 'daily' o 'weekly'
    metric VARCHAR(100) NOT NULL,        -- ej: 'kills', 'visionScore', 'csPerMinute'
    goal INTEGER NOT NULL,
    progress INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Índice para búsquedas rápidas
CREATE INDEX idx_user_challenges_user_id ON user_challenges(user_id);
EOL
echo "src/lib/db/schema.sql actualizado."


echo ""
echo "=========================================================="
echo "      ✅ LIMPIEZA DE CÓDIGO DE PADDLE COMPLETADA"
echo "=========================================================="
echo "Ahora, debes ejecutar estas acciones **manualmente** en tu terminal para finalizar la limpieza de dependencias y la base de datos:"
echo ""
echo "1. Desinstalar la dependencia de Node (esto limpia package-lock.json):"
echo "npm uninstall @paddle/paddle-node-sdk"
echo ""
echo "2. Reinstalar dependencias (para asegurar la coherencia):"
echo "npm install"
echo ""
echo "3. Si tu base de datos ya está creada, ejecuta este SQL para eliminar la columna obsoleta:"
echo "ALTER TABLE users DROP COLUMN IF EXISTS paddle_customer_id;"
echo ""
echo "Una vez hecho esto, tu proyecto usará Hotmart exclusivamente con la URL:"
echo "${HOTMART_CHECKOUT_URL}"