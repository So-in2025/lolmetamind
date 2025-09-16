#!/bin/bash

echo "Iniciando las actualizaciones de 'LoL MetaMind'..."

# Asegurarse de que el directorio de componentes existe
mkdir -p src/components

# --- Fase 1: Mejorar el Overlay del Coach y la Narración ---

echo "Actualizando el archivo OBSOverlay.jsx para incluir la narración en tiempo real..."
# Reemplazar la línea ws.current con la variable de entorno y añadir la funcionalidad de voz
cat << 'EOF' > src/components/widgets/OBSOverlay.jsx
'use client';
import React, { useState, useEffect, useRef } from 'react';

const OBSOverlay = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wsMessage, setWsMessage] = useState(null);

  const ws = useRef(null);

  useEffect(() => {
    // Evitar reconexiones múltiples en desarrollo
    if (!ws.current) {
      ws.current = new WebSocket(process.env.NEXT_PUBLIC_WEBSOCKET_URL);
      console.log('Intento de conexión WebSocket...');

      ws.current.onopen = () => {
        console.log('🔗 Conectado al servidor WebSocket para el coach.');
      };

      ws.current.onmessage = (event) => {
        console.log('✉️ Mensaje del servidor:', event.data);
        setWsMessage(event.data);
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

    // Lógica para obtener datos iniciales de la API
    const fetchOverlayData = async () => {
      try {
        const response = await fetch('/api/overlay');
        if (!response.ok) {
          throw new Error('No se pudo cargar la data del overlay.');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOverlayData();
    const interval = setInterval(fetchOverlayData, 10000);

    return () => {
      clearInterval(interval);
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
    };
  }, []);

  if (loading) {
    return <div className="bg-gray-900 bg-opacity-70 text-white p-4 rounded-lg shadow-lg max-w-sm mx-auto">Cargando datos...</div>;
  }
  if (error) {
    return <div className="bg-gray-900 bg-opacity-70 text-red-500 p-4 rounded-lg shadow-lg max-w-sm mx-auto">Error: {error}</div>;
  }
  return (
    <div className="bg-gray-900 bg-opacity-70 text-white p-4 rounded-lg shadow-lg max-w-sm mx-auto">
      <h3 className="text-xl font-bold text-cyan-400 mb-2">Consejos en Partida</h3>
      <p className="text-sm mb-2"><strong className="font-semibold">Jugador:</strong> {data.summonerName}</p>
      <p className="text-sm mb-2"><strong className="font-semibold">Campeón:</strong> {data.champion} ({data.role})</p>

      <div className="bg-purple-800 p-3 rounded-lg mt-4 animate-pulse">
        <p className="text-lg font-bold text-yellow-300">¡Alerta Estratégica!</p>
        <p className="text-sm mt-1">{wsMessage || "Esperando consejos del coach..."}</p>
      </div>

      <ul className="mt-4 space-y-2 text-sm">
        {data.tips.map(tip => (
          <li key={tip.id} className="bg-gray-800 p-2 rounded-md">
            {tip.content}
          </li>
        ))}
      </ul>
    </div>
  );
};
export default OBSOverlay;
EOF

echo "Modificando el servidor WebSocket para que sea compatible con Render..."
# Reemplazar el código del servidor con la nueva versión
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

# --- Fase 2: Implementar los Retos Semanales ---

echo "Creando el nuevo componente WeeklyChallenges.jsx..."
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

echo "Actualizando page.jsx para incluir el componente de retos..."
# Reemplazar la sección de 'Novedades' con el nuevo componente
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

echo "¡Script completado! Se han modificado los archivos."
echo "Ahora puedes hacer 'git commit' y 'git push' para subir los cambios."