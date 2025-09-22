'use client';
import React, { useState } from 'react'; // Eliminado useEffect y useRef si no se usan directamente aquí
import { motion, AnimatePresence } from 'framer-motion';
import { FaBrain, FaCrosshairs, FaPalette, FaMicrophoneAlt, FaFilm, FaTrophy, FaFacebook, FaGlobe } from 'react-icons/fa';
import EpicButton from '@/components/landing/EpicButton';
import VideoPlayer from '@/components/landing/VideoPlayer';
import PricingPlans from '@/components/pricing/PricingPlans'; // Asegúrate de que este componente exista en esta ruta

export default function LandingPage() {
  const [siteEntered, setSiteEntered] = useState(false);
  const [loadVideo, setLoadVideo] = useState(false);
  
  // Array de características, basado en tu código original
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

  // --- ETAPA 1: PÁGINA DE INGRESO (CON hero-bg.webp COMO FONDO) ---
  if (!siteEntered) {
    return (
      <main className="min-h-screen flex flex-col justify-center items-center text-center p-4 bg-black text-white" 
            style={{ 
                backgroundImage: "url('/img/hero-bg.webp')", // <-- Fondo de la primera etapa
                backgroundSize: 'cover', 
                backgroundPosition: 'center' 
            }}>
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
          {/* Texto de la primera pantalla, si hay */}
          <p className="mt-4 text-xl md:text-2xl text-lol-gold-light/90 max-w-2xl mx-auto">
             Tu ventaja estratégica ha llegado.
          </p>
          <div className="mt-10">
            <EpicButton onClick={handleEnter}>Ingresar</EpicButton>
          </div>
        </motion.div>
      </main>
    );
  }

  // --- ETAPA 2: LANDING PAGE COMPLETA (CON background.webp COMO FONDO PRINCIPAL) ---
  return (
    <div className="min-h-screen text-white" 
         style={{ 
             backgroundImage: "url('/img/background.webp')", // <-- Fondo de la segunda etapa, fijo
             backgroundSize: 'cover', 
             backgroundPosition: 'center', 
             backgroundAttachment: 'fixed' 
         }}>
        
        {/* Hero Section (usa hero-bg.webp para su propio fondo) */}
        <section className="h-screen flex flex-col justify-center items-center text-center p-4" 
                 style={{ 
                     backgroundImage: "url('/img/hero-bg.webp')", // <-- Fondo para la primera sección de la landing
                     backgroundSize: 'cover', 
                     backgroundPosition: 'center' 
                 }}>
            <div className="bg-black bg-opacity-60 p-8 rounded-lg shadow-2xl">
                <motion.h1 initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1 }} className="text-5xl md:text-7xl font-bold text-shadow-lg text-lol-gold-light text-stroke" style={{ fontFamily: "'BeaufortforLOL-Bold', serif" }}>
                    LOL METAMIND
                </motion.h1>
                {/* Texto descriptivo de la segunda etapa */}
                <motion.p initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1, delay: 0.2 }} className="mt-4 text-xl md:text-2xl text-lol-gold-light/90 max-w-2xl">
                    La única plataforma que fusiona la Astrología + IA + Analíticas Riot, para darte coaching en tiempo real, clips virales y una ventaja estratégica. Bienvenido al futuro del coaching. Una experiencia inmersiva que se adapta a tu estilo.
                </motion.p>
                <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, delay: 0.5 }}>
                    <EpicButton onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}>
                        Explorar la Plataforma
                    </EpicButton>
                </motion.div>
            </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-lol-blue-dark/80">
            <div className="container mx-auto px-4">
                <h2 className="text-4xl md:text-5xl font-bold text-center text-lol-gold mb-12" style={{ fontFamily: "'BeaufortforLOL-Bold', serif" }}>
                    Tu Ventaja Competitiva
                </h2>
                <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8"> {/* Ajuste el grid para 3 columnas en pantallas grandes */}
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

        {/* Pricing Plans Section */}
        <section id="pricing-section" className="py-20 bg-lol-blue-dark/90">
            <div className="container mx-auto px-4">
                <PricingPlans /> {/* Este componente se mantiene igual */}
            </div>
        </section>
        
        {/* Call to Action Section */}
        <section className="py-20 bg-lol-blue-medium/80 text-center">
             <h2 className="text-4xl md:text-5xl font-bold text-center text-lol-gold mb-8" style={{ fontFamily: "'BeaufortforLOL-Bold', serif" }}>
                ¿Listo para tu Ascenso?
            </h2>
            <motion.p initial={{ y: 50, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.2 }} className="text-lol-gold-light/90 text-lg md:text-2xl mb-10 max-w-3xl mx-auto text-shadow-md">
                Dejá de adivinar. Empezá a dominar. Uníte a la revolución de estrategia y contenido con el poder de la IA y la astrología.
            </motion.p>
            <EpicButton onClick={() => window.location.href='/api/auth/google'}>Registrate Gratis</EpicButton>
        </section>

        {/* Footer Section */}
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
