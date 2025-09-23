#!/bin/bash

# ==============================================================================
# SCRIPT DE CORRECCIÓN FIEL: LoL MetaMind
# Corrige un proyecto ya unificado para que la landing page sea una réplica
# exacta del código y diseño original, sin alterar la visión del autor.
# ==============================================================================

# --- Colores para la salida ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Iniciando la corrección final de LoL MetaMind...${NC}"

# --- 1. Instalar TODAS las dependencias necesarias ---
echo -e "\n${CYAN}[PASO 1/5] Asegurando todas las dependencias necesarias...${NC}"
npm install react-youtube framer-motion react-icons
echo -e "${GREEN}Dependencias instaladas/verificadas. ✅${NC}"

# --- 2. Crear/Restaurar los componentes originales de la landing ---
echo -e "\n${CYAN}[PASO 2/5] Restaurando los componentes originales...${NC}"
mkdir -p ./src/components/landing

# Restaurar EpicButton.jsx
cat << 'EOF' > ./src/components/landing/EpicButton.jsx
import React from 'react';
import { motion } from 'framer-motion';

const EpicButton = ({ children, onClick }) => {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="bg-lol-gold hover:bg-lol-gold-dark text-lol-blue-dark font-bold py-3 px-8 rounded-lg shadow-lg uppercase tracking-wider text-lg transition-colors duration-300"
      style={{ fontFamily: "'BeaufortforLOL-Bold', serif" }}
    >
      {children}
    </motion.button>
  );
};

export default EpicButton;
EOF

# Restaurar VideoPlayer.jsx adaptado para react-youtube
cat << 'EOF' > ./src/components/landing/VideoPlayer.jsx
'use client';
import React from 'react';
import YouTube from 'react-youtube';

const VideoPlayer = ({ videoId }) => {
  const opts = {
    playerVars: {
      autoplay: 1,
      controls: 0,
      loop: 1,
      playlist: videoId,
      mute: 1,
      modestbranding: 1,
      showinfo: 0,
      start: 0,
      fs: 0,
      iv_load_policy: 3
    },
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
      <YouTube
        videoId={videoId}
        opts={opts}
        className="absolute top-1/2 left-1/2 w-full h-full -translate-x-1/2 -translate-y-1/2"
        style={{
            width: '177.77777778vh', /* 100 * (16/9) */
            minWidth: '100%',
            minHeight: '56.25vw' /* 100 * (9/16) */
        }}
      />
    </div>
  );
};

export default VideoPlayer;
EOF
echo -e "${GREEN}Componentes restaurados. ✅${NC}"

# --- 3. Restaurar Estilos Originales ---
echo -e "\n${CYAN}[PASO 3/5] Restaurando los estilos originales en globals.css...${NC}"
# Se combina el globals.css de la app con los estilos base de tu landing
cat << 'EOF' > ./src/app/globals.css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Roboto:wght@400;700&display=swap');

@font-face {
    font-family: 'BeaufortforLOL-Bold';
    src: url('/fonts/BeaufortforLOL-Bold.woff2') format('woff2');
    font-weight: bold;
    font-style: normal;
}

body {
  background-color: #0d1117;
  color: white;
  font-family: 'Roboto', sans-serif;
  margin: 0;
}

.text-stroke {
    -webkit-text-stroke: 1px #000;
}
EOF
echo -e "${GREEN}Estilos restaurados con éxito. ✅${NC}"

# --- 4. Reemplazar la Página Principal (/) con TU CÓDIGO ORIGINAL ---
echo -e "\n${CYAN}[PASO 4/5] Reemplazando la página principal con tu código original...${NC}"
cat << 'EOF' > ./src/app/page.jsx
'use client';
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBrain, FaCrosshairs, FaPalette, FaMicrophoneAlt, FaFilm, FaTrophy, FaFacebook, FaGlobe } from 'react-icons/fa';
import EpicButton from '@/components/landing/EpicButton';
import VideoPlayer from '@/components/landing/VideoPlayer';
import PricingPlans from '@/components/pricing/PricingPlans';

export default function LandingPage() {
  const [siteEntered, setSiteEntered] = useState(false);
  const [loadVideo, setLoadVideo] = useState(false);
  
  const features = [
    { title: 'Recomendador IA', desc: 'Recibe recomendaciones de campeón, rol y estilo de juego basadas en tu personalidad y signo zodiacal, con 3 tips clave para empezar a ganar.', icon: <FaBrain /> },
    { title: 'Análisis de Partida 360°', desc: 'Domina cada partida con builds y runas adaptativas, análisis pre-juego, consejos en vivo y reportes post-partida para explotar tus fortalezas.', icon: <FaCrosshairs /> },
    { title: 'Overlays Inteligentes', desc: 'Transforma tu stream con overlays que te narran consejos y planes de juego en tiempo real para que no quites la vista de la acción.', icon: <FaPalette /> },
    { title: 'Narración con IA (TTS)', desc: 'Escucha los consejos del coach con una voz profesional en tu idioma, sin interrumpir tu concentración.', icon: <FaMicrophoneAlt /> },
    { title: 'Clips Virales Automáticos', desc: 'La IA detecta tus mejores jugadas y las convierte en clips listos para compartir en redes sociales y construir tu marca personal.', icon: <FaFilm /> },
    { title: 'Gamificación y Misiones', desc: 'Supera misiones diarias y semanales diseñadas por la IA para corregir tus puntos débiles y gana recompensas exclusivas.', icon: <FaTrophy /> },
  ];

  const handleEnter = () => {
    const audio = new Audio("https://www.myinstants.com/media/sounds/league-of-legends-worlds-2020-champ-select.mp3");
    audio.play().catch(e => console.error("Error playing audio:", e));
    setLoadVideo(true);
    setTimeout(() => {
      setSiteEntered(true);
    }, 500); // Pequeño delay para la transición
  };

  if (!siteEntered) {
    return (
      <main className="min-h-screen flex flex-col justify-center items-center text-center p-4 bg-black text-white" style={{ backgroundImage: "url('/img/hero-bg.webp')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <AnimatePresence>
          {loadVideo && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-0">
              <VideoPlayer videoId="j_6_eZ_eY3g" />
            </motion.div>
          )}
        </AnimatePresence>
        <div className="absolute inset-0 bg-black bg-opacity-40 z-10"></div>
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }} className="relative z-20">
          <h1 className="text-6xl md:text-8xl font-bold text-shadow-lg text-lol-gold-light text-stroke" style={{ fontFamily: "'BeaufortforLOL-Bold', serif" }}>
            LOL METAMIND
          </h1>
          <div className="mt-10">
            <EpicButton onClick={handleEnter}>Ingresar</EpicButton>
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <div className="min-h-screen text-white" style={{ backgroundImage: "url('/img/background.webp')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
        <section className="h-screen flex flex-col justify-center items-center text-center p-4" style={{ backgroundImage: "url('/img/hero-bg.webp')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <div className="bg-black bg-opacity-60 p-8 rounded-lg shadow-2xl">
                <motion.h1 initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1 }} className="text-5xl md:text-7xl font-bold text-shadow-lg text-lol-gold-light text-stroke" style={{ fontFamily: "'BeaufortforLOL-Bold', serif" }}>
                    LOL METAMIND
                </motion.h1>
                <motion.p initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1, delay: 0.2 }} className="mt-4 text-xl md:text-2xl text-lol-gold-light/90 max-w-2xl">
                    La plataforma de coaching de League of Legends con IA que te da una ventaja estratégica.
                </motion.p>
                <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, delay: 0.5 }}>
                    <EpicButton onClick={() => document.getElementById('pricing-section').scrollIntoView({ behavior: 'smooth' })}>
                        Explorar la Plataforma
                    </EpicButton>
                </motion.div>
            </div>
        </section>

        <section id="features" className="py-20 bg-lol-blue-dark/80">
            <div className="container mx-auto px-4">
                <h2 className="text-4xl md:text-5xl font-bold text-center text-lol-gold mb-12" style={{ fontFamily: "'BeaufortforLOL-Bold', serif" }}>
                    Tu Ventaja Competitiva
                </h2>
                <div className="grid md:grid-cols-3 gap-8">
                    {features.map((feature, i) => (
                        <motion.div key={feature.title} initial={{ y: 50, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }} className="p-6 bg-lol-blue-medium rounded-lg border border-lol-gold-dark/50 text-center">
                            <div className="text-4xl text-lol-blue-accent mb-4 inline-block">{feature.icon}</div>
                            <h3 className="text-2xl font-bold text-lol-gold mb-2">{feature.title}</h3>
                            <p className="text-lol-gold-light/80">{feature.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>

        <section id="pricing-section" className="py-20 bg-lol-blue-dark/90">
            <div className="container mx-auto px-4">
                <PricingPlans />
            </div>
        </section>
        
        <section className="py-20 bg-lol-blue-medium/80 text-center">
             <h2 className="text-4xl md:text-5xl font-bold text-center text-lol-gold mb-8" style={{ fontFamily: "'BeaufortforLOL-Bold', serif" }}>
                ¿Listo para tu Ascenso?
            </h2>
            <motion.p initial={{ y: 50, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.2 }} className="text-lol-gold-light/90 text-lg md:text-2xl mb-10 max-w-3xl mx-auto text-shadow-md">
                Dejá de adivinar. Empezá a dominar. Uníte a la revolución de estrategia y contenido con el poder de la IA y la astrología.
            </motion.p>
            <EpicButton onClick={() => window.location.href='/api/auth/google'}>Registrate Gratis</EpicButton>
        </section>

        <footer className="py-8 bg-lol-blue-dark text-center text-lol-gold-light/70 border-t border-lol-gold-dark">
            <div className="flex justify-center items-center gap-6 mb-4">
                <a href="https://www.facebook.com/SolucionesSOIN" target="_blank" rel="noopener noreferrer" className="hover:text-lol-blue-accent transition-colors">
                    <FaFacebook size={28} />
                </a>
                <a href="https://websoin.netlify.app/" target="_blank" rel="noopener noreferrer" className="hover:text-lol-blue-accent transition-colors">
                    <FaGlobe size={28} />
                </a>
            </div>
            <p>Un proyecto de <strong>SO-IN</strong></p>
        </footer>
    </div>
  );
}
EOF
echo -e "${GREEN}Página principal restaurada fielmente. ✅${NC}"

# --- 5. Limpieza de Archivos Incorrectos ---
echo -e "\n${CYAN}[PASO 5/5] Eliminando archivos y carpetas incorrectas de intentos anteriores...${NC}"
rm -rf ./src/app/presentation
rm -f ./src/components/forms/ProfileFlowForm.jsx
echo -e "${GREEN}Limpieza completada. ✅${NC}"

echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡CORRECCIÓN COMPLETADA! ✅"
echo -e "Tu proyecto ahora tiene la landing page original como página de inicio."
echo -e "Ejecuta 'npm run dev' para verificar."
echo -e "----------------------------------------------------------------------${NC}"