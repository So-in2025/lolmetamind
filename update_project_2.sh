#!/bin/bash

echo "Iniciando la actualización completa del proyecto LoL MetaMind..."

# Crear directorios si no existen para evitar errores
mkdir -p src/components/widgets src/components/forms src/app/api/challenges

# --- Paso 1: Actualizar el servidor WebSocket para compatibilidad con Render ---
echo "1. Actualizando websocket-server.js para compatibilidad con Render..."
cat << 'EOF' > websocket-server.js
const WebSocket = require('ws');

const port = process.env.PORT || 8080;

const wss = new WebSocket.Server({ port });

console.log(`✅ Servidor WebSocket para el Coach en Tiempo Real iniciado en el puerto ${port}.`);

const coachingTips = [
  "¡Alerta! El jungla enemigo (Lee Sin) está cerca. Juega de forma más segura.",
  "Estás ganando tu línea. Presiona al enemigo y destruye la torreta lo antes posible.",
  "El Heraldo está disponible. Ve a ayudar a tu jungla para tomar el objetivo.",
  "Necesitas agruparte con tu equipo. Las peleas en grupo son tu fortaleza.",
  "Atención al mapa. El ADC enemigo (Jinx) está solo en la línea inferior."
];

let tipIndex = 0;

wss.on('connection', ws => {
  console.log('🔗 Cliente WebSocket conectado.');
  ws.send('👋 Bienvenido al coach en tiempo real.');

  const interval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(coachingTips[tipIndex]);
      console.log(`✉️ Enviando consejo: "${coachingTips[tipIndex]}"`);
      tipIndex = (tipIndex + 1) % coachingTips.length;
    }
  }, 5000);

  ws.on('close', () => {
    console.log('💔 Cliente WebSocket desconectado.');
    clearInterval(interval);
  });
  
  ws.on('message', message => {
    console.log(`✉️ Mensaje recibido del cliente: ${message}`);
  });
});
EOF

# --- Paso 2: Crear el componente de Retos Semanales y actualizar la página principal ---
echo "2. Creando el nuevo componente WeeklyChallenges.jsx..."
cat << 'EOF' > src/components/WeeklyChallenges.jsx
'use client';
import React, { useState, useEffect } from 'react';

const WeeklyChallenges = () => {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        const response = await fetch('/api/challenges/weekly');
        if (!response.ok) {
          throw new Error('No se pudo cargar la lista de retos.');
        }
        const result = await response.json();
        setChallenges(result);
      } catch (err) {
        console.error('Error al obtener retos:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchChallenges();
  }, []);

  if (loading) {
    return <div className="bg-lol-blue-medium p-6 rounded-xl shadow-lg w-full text-center animate-pulse">Cargando retos...</div>;
  }

  if (error) {
    return <div className="bg-lol-blue-medium text-red-400 p-6 rounded-xl shadow-lg w-full text-center">Error: {error}</div>;
  }

  return (
    <div className="bg-lol-blue-medium p-8 rounded-xl shadow-lg w-full border-2 border-lol-gold-dark mt-12">
      <h3 className="text-2xl font-display font-bold text-lol-gold mb-4 text-center">Retos Semanales</h3>
      {challenges.length > 0 ? (
        <ul className="space-y-4">
          {challenges.map(challenge => (
            <li key={challenge.id} className="bg-lol-blue-dark p-4 rounded-lg border border-lol-gold-dark flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h4 className="font-display font-bold text-lol-blue-accent">{challenge.title}</h4>
                <p className="text-sm text-lol-gold-light/80 mt-1">{challenge.description}</p>
                <div className="mt-2 text-sm">
                  <span className="font-semibold text-lol-gold-light">Progreso:</span> {challenge.progress}/{challenge.goal}
                </div>
              </div>
              <span className="mt-3 md:mt-0 px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full">
                Recompensa: {challenge.reward}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center text-lol-gold-light/70">No hay retos semanales disponibles en este momento.</p>
      )}
    </div>
  );
};

export default WeeklyChallenges;
EOF

echo "3. Actualizando src/app/page.jsx para incluir el componente de retos..."
cat << 'EOF' > src/app/page.jsx
import ProfileForm from '@/components/forms/ProfileForm'
import WeeklyChallenges from '@/components/WeeklyChallenges'
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col justify-start items-center p-8 bg-lol-blue-dark text-lol-gold-light font-body">
      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-12 mt-12">

        {/* Columna de la izquierda: Formulario y Contenido */}
        <div className="w-full lg:w-1/2 flex flex-col items-center">
          <div className="w-full max-w-lg mb-8 text-center lg:text-left">
            <h1 className="text-5xl md:text-6xl font-display font-bold text-lol-blue-accent mb-4 text-shadow-lg">
              LoL MetaMind
            </h1>
            <p className="text-lg md:text-xl text-lol-gold-light/90 mb-6">
              La plataforma de coaching de League of Legends con IA que te da una ventaja estratégica.
            </p>
          </div>
          <ProfileForm />
          <div className="mt-8 text-center">
            <h3 className="text-xl font-display font-bold text-lol-gold mb-2">Para Streamers</h3>
            <Link href="/overlay" className="text-lol-blue-accent hover:text-lol-gold transition-colors duration-300">
              Ver el widget de OBS »
            </Link>
          </div>
        </div>

        {/* Columna de la derecha: Contenido Extra / Próximas Características */}
        <div className="w-full lg:w-1/2 flex flex-col items-center mt-12 lg:mt-32">
          <div className="w-full max-w-lg bg-lol-blue-medium p-8 rounded-xl shadow-lg border-2 border-lol-gold-dark text-center">
            <h3 className="text-xl font-display font-bold text-lol-gold mb-4">¡Novedades!</h3>
            <p className="text-lol-gold-light/90">
              Estamos trabajando en las próximas funciones: gamificación, builds premium y más.
              ¡Sigue atento a las actualizaciones de la plataforma!
            </p>
          </div>
          <div className="w-full max-w-lg">
            <WeeklyChallenges />
          </div>
        </div>
      </div>
    </main>
  );
}
EOF

# --- Paso 4: Unificar el Panel de Control con narración de audio ---
echo "4. Actualizando src/components/widgets/OBSOverlay.jsx para unificar el panel y añadir narración..."
cat << 'EOF' > src/components/widgets/OBSOverlay.jsx
'use client';
import React, { useState, useEffect, useRef } from 'react-g';

const OBSOverlay = () => {
  const [data, setData] = useState(null);
  const [builds, setBuilds] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wsMessage, setWsMessage] = useState(null);

  const ws = useRef(null);

  useEffect(() => {
    // Conexión con el servidor WebSocket
    if (!ws.current) {
      ws.current = new WebSocket(process.env.NEXT_PUBLIC_WEBSOCKET_URL);
      console.log('Intento de conexión WebSocket...');

      ws.current.onopen = () => {
        console.log('🔗 Conectado al servidor WebSocket para el coach.');
      };

      ws.current.onmessage = (event) => {
        console.log('✉️ Mensaje del servidor:', event.data);
        setWsMessage(event.data);
        // **NUEVA FUNCIONALIDAD: NARRACIÓN EN TIEMPO REAL**
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(event.data);
          window.speechSynthesis.speak(utterance);
        }
      };

      ws.current.onclose = () => {
        console.log('💔 Desconectado del servidor WebSocket.');
      };

      ws.current.onerror = (err) => {
        console.error('❌ Error en WebSocket:', err);
      };
    }

    // Lógica para obtener TODOS los datos iniciales de las APIs simuladas
    const fetchAllData = async () => {
      try {
        const [overlayRes, buildsRes, recRes] = await Promise.all([
          fetch('/api/overlay'),
          fetch('/api/builds', { method: 'POST', body: JSON.stringify({ matchData: {} }), headers: { 'Content-Type': 'application/json' } }),
          fetch('/api/recommendation', { method: 'POST', body: JSON.stringify({ playerData: {} }), headers: { 'Content-Type': 'application/json' } })
        ]);

        if (!overlayRes.ok || !buildsRes.ok || !recRes.ok) {
          throw new Error('No se pudo cargar la data del overlay o las recomendaciones.');
        }

        const overlayResult = await overlayRes.json();
        const buildsResult = await buildsRes.json();
        const recResult = await recRes.json();

        setData(overlayResult);
        setBuilds(buildsResult);
        setRecommendation(recResult);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
    const interval = setInterval(fetchAllData, 30000); // Refrescar los datos de la partida cada 30s
    
    return () => {
      clearInterval(interval);
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
    };
  }, []);

  if (loading) {
    return <div className="bg-lol-blue-dark bg-opacity-90 text-lol-gold-light p-6 rounded-xl shadow-lg w-full text-center animate-pulse max-w-sm mx-auto border-2 border-lol-gold-dark">Cargando datos...</div>;
  }
  if (error) {
    return <div className="bg-lol-blue-dark bg-opacity-90 text-red-500 p-6 rounded-xl shadow-lg w-full text-center max-w-sm mx-auto border-2 border-lol-gold-dark">Error: {error}</div>;
  }
  return (
    <div className="bg-lol-blue-dark bg-opacity-90 text-lol-gold-light p-6 rounded-xl shadow-lg w-full border-2 border-lol-gold-dark max-w-lg mx-auto">
      <h3 className="text-xl font-display font-bold text-lol-blue-accent mb-4 text-center">Panel del Coach</h3>

      <div className="bg-lol-blue-medium p-4 rounded-lg mb-4">
        <p className="text-sm mb-2"><strong className="font-semibold text-lol-gold">Jugador:</strong> {data.summonerName}</p>
        <p className="text-sm mb-2"><strong className="font-semibold text-lol-gold">Campeón:</strong> {data.champion} ({data.role})</p>
        <p className="text-sm"><strong className="font-semibold text-lol-gold">Arquetipo:</strong> <span className="text-purple-400">{recommendation.archetype}</span></p>
      </div>

      <div className="bg-purple-800 p-3 rounded-lg animate-pulse mb-4">
        <p className="text-lg font-bold text-yellow-300">¡Alerta Estratégica!</p>
        <p className="text-sm mt-1">{wsMessage || "Esperando consejos del coach..."}</p>
      </div>
      
      {builds && (
        <div className="bg-lol-blue-medium p-4 rounded-lg">
          <h4 className="text-md font-display font-bold text-lol-gold mb-2">Build Recomendada</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-lol-gold-light/80">
            {builds.items.map((item, index) => <li key={index}>{item.name}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};
export default OBSOverlay;
EOF

echo "¡Script completado! Se han modificado los archivos."
echo "Ahora puedes hacer 'git commit' y 'git push' para subir los cambios."