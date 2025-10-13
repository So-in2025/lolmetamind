'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBrain, FaCrosshairs, FaPalette, FaMicrophoneAlt, FaFilm, FaTrophy, FaFacebook, FaGlobe, FaCheckCircle, FaStar, FaVolumeUp, FaVolumeMute, FaBookOpen, FaExclamationTriangle } from 'react-icons/fa'; 
import EpicButton from '@/components/landing/EpicButton';
import VideoPlayer from '@/components/landing/VideoPlayer';
import Link from 'next/link';

// ====================================================================================
// 🔹 SUB-COMPONENTE: Header (Menú de Navegación)
// Tu componente original, sin cambios.
// ====================================================================================
const Header = () => {
  const navLinks = [
    { name: 'Inicio', href: '#hero-section' },
    { name: 'Características', href: '#features-section' },
    { name: 'Planes', href: '#arsenal-section' },
    { name: 'Guía', href: '/guia' }, // Enlace a la nueva página de la guía
  ];

  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 bg-lol-blue-dark/80 backdrop-blur-md border-b border-lol-gold-dark/50"
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-display font-bold text-lol-gold-light">MetaMind</h1>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navLinks.map((link) => (
                <a 
                  key={link.name} 
                  href={link.href} 
                  className="text-lol-gold-light/80 hover:bg-lol-blue-medium hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      </nav>
    </motion.header>
  );
};

// ====================================================================================
// 🚀 COMPONENTE PRINCIPAL: LandingPage
// Tu componente original, sin cambios en la lógica.
// ====================================================================================
export default function LandingPage() {
  const [siteEntered, setSiteEntered] = useState(false);
  const [loadVideo, setLoadVideo] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef(null);

  // Tus textos originales para las características.
  const features = [
    { title: 'Coach de Draft Híbrido', desc: 'Recibe un análisis automático al inicio del draft. Luego, con un clic, obtén un plan de juego y runas optimizadas para el campeón que pre-selecciones.', icon: <FaBrain /> },
    { title: 'Coach Táctico en Vivo', desc: 'Tu copiloto en la Grieta. Recibe consejos de audio periódicos y contextuales sobre macrojuego, compra de ítems y objetivos sin quitar la vista de la acción.', icon: <FaCrosshairs /> },
    { title: 'Overlay Inteligente', desc: 'Una interfaz limpia y profesional que te muestra la información que necesitas, cuando la necesitas, desde el draft hasta la pantalla de victoria.', icon: <FaPalette /> },
    { title: 'Narrador Táctico (TTS)', desc: 'Nuestra tecnología de voz local te narra cada consejo estratégico con claridad y sin retrasos, permitiéndote mantener la concentración total en el juego.', icon: <FaMicrophoneAlt /> },
    { title: 'Inyector de Runas', desc: 'Con un solo clic, importa la página de runas recomendada por la IA directamente en tu cliente de LoL, ahorrándote tiempo y errores cruciales.', icon: <FaStar /> },
    { title: 'Análisis Post-Partida', desc: 'Al finalizar cada partida, la IA actualiza tu perfil de rendimiento en segundo plano, aprendiendo de tus jugadas para darte consejos cada vez más personalizados.', icon: <FaTrophy /> }
  ];

  const handleSiteEnter = () => {
    try {
        const audio = new Audio('/welcome.mp3');
        audio.play();
    } catch (e) {
        console.warn("No se pudo reproducir el audio de bienvenida:", e);
    }
    setSiteEntered(true);
    setTimeout(() => setLoadVideo(true), 500); // Pequeño delay para una transición más suave
  };
  
  const onPlayerReady = (event) => {
    videoRef.current = event.target;
    if(!isMuted) event.target.unMute();
  };
  
  const toggleMute = () => {
    if (videoRef.current) {
        if (isMuted) videoRef.current.unMute();
        else videoRef.current.mute();
        setIsMuted(!isMuted);
    }
  };

  // Pantalla de "Ingreso" inicial
  if (!siteEntered) {
    return (
      <div className="h-screen w-screen bg-lol-blue-dark flex flex-col justify-center items-center text-center p-4 bg-[url('/img/background.webp')] bg-cover bg-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
        >
          <h1 className="text-6xl md:text-8xl font-display font-extrabold text-lol-gold-light text-shadow-lg">
            MetaMind Coach
          </h1>
          <p className="mt-4 text-lg md:text-2xl max-w-3xl text-lol-gold-light/90 text-shadow-md">
            Tu ventaja estratégica ha llegado.
          </p>
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-12"
          >
             <EpicButton onClick={handleSiteEnter}>INGRESAR AL NEXO</EpicButton>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Contenido principal de la página
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="min-h-screen bg-lol-blue-dark text-lol-gold-light font-body overflow-x-hidden bg-[url('/img/background.webp')] bg-cover bg-center bg-fixed"
      >
        <Header />
        
        <main>
          <section
            id="hero-section"
            className="relative h-screen flex flex-col justify-center items-center text-center px-4 pt-16"
            style={{ backgroundImage: "linear-gradient(rgba(1, 10, 19, 0.7), rgba(1, 10, 19, 0.9)), url('/img/hero-bg.webp')" }}
          >
            <motion.h1
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              className="text-6xl md:text-8xl font-display font-extrabold text-lol-gold-light text-shadow-lg"
            >
              MetaMind Coach
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 1 }}
              className="mt-4 text-lg md:text-2xl max-w-3xl text-lol-gold-light/90 text-shadow-md"
            >
              La única plataforma que fusiona tu perfil astrológico con IA para darte coaching en tiempo real, desde el draft hasta la pantalla de victoria.
            </motion.p>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.8, type: 'spring', stiffness: 100 }}
              className="mt-10"
            >
              <EpicButton onClick={() => document.getElementById('features-section').scrollIntoView({ behavior: 'smooth' })}>
                  Descubrir Funcionalidades
              </EpicButton>
            </motion.div>
          </section>

          <section className="py-20 px-4 bg-lol-blue-dark/80 backdrop-blur-sm">
            <motion.h2
              initial={{ x: -100, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="text-4xl md:text-6xl font-display font-bold text-center mb-16 text-lol-gold text-shadow-md"
            >
              Una Nueva Era en Estrategia
            </motion.h2>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2 }}
              className="w-full max-w-4xl mx-auto shadow-2xl border-4 border-lol-gold-dark rounded-xl overflow-hidden"
              style={{ boxShadow: '0 0 35px rgba(200, 155, 60, 0.3)' }}
            >
                {loadVideo && (
                    <div className="relative w-full aspect-video">
                        <VideoPlayer videoId="jss22SRCvms" onReady={onPlayerReady} />
                        <button
                            onClick={toggleMute}
                            className="absolute bottom-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/80 transition-colors"
                        >
                            {isMuted ? <FaVolumeMute size={20} /> : <FaVolumeUp size={20} />}
                        </button>
                    </div>
                )}
            </motion.div>
          </section>

          <section id="features-section" className="py-20 px-4 bg-lol-blue-dark">
            <motion.h2 initial={{ y: 50, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1 }} className="text-4xl md:text-6xl font-display font-bold text-center text-lol-gold mb-16 text-shadow-md">
                Un Arsenal de Ventajas
            </motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {features.map((feature, idx) => (
                  <motion.div key={idx} initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: idx * 0.1 }} className="bg-lol-blue-medium p-8 border-2 border-lol-gold-dark/40 hover:border-lol-blue-accent transition-colors duration-300 flex flex-col items-center text-center rounded-lg">
                    <div className="text-5xl text-lol-blue-accent mb-5">{feature.icon}</div>
                    <h3 className="text-2xl font-display font-bold mb-3 text-lol-gold">{feature.title}</h3>
                    <p className="text-lol-gold-light/80 text-base leading-relaxed flex-grow">{feature.desc}</p>
                  </motion.div>
              ))}
            </div>
          </section>

          {/* ================================================================== */}
          {/* ✅ SECCIÓN DE PLANES ACTUALIZADA (ARSENAL)                        */}
          {/* ================================================================== */}
          <section id="arsenal-section" className="py-20 px-4 bg-lol-blue-dark/90">
            <motion.h2 initial={{ y: 50, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1 }} className="text-4xl md:text-6xl font-display font-bold text-center text-lol-gold mb-16 text-shadow-md">
                Elegí Tu Arsenal
            </motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
              
              {/* PLAN GRATUITO */}
              <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 1 }} className="bg-lol-blue-medium p-8 border-2 border-lol-gold-dark/40 rounded-lg flex flex-col">
                  <h3 className="text-3xl font-display font-bold text-lol-gold-light mb-4">Plan Invocador (Gratis)</h3>
                  <p className="text-lol-gold-light/70 mb-8 flex-grow">Todas las herramientas para empezar a dominar, con un límite de uso diario.</p>
                  <ul className="space-y-4 text-lg mb-8">
                    <li className="flex items-center gap-3"><FaCheckCircle className="text-green-400" /> Acceso a <strong className="text-white">TODAS</strong> las funciones de coaching</li>
                    <li className="flex items-center gap-3"><FaCheckCircle className="text-green-400" /> Coach Pre-Partida, de Draft y en Vivo</li>
                    <li className="flex items-center gap-3"><FaCheckCircle className="text-green-400" /> Inyector de Runas 1-Clic</li>
                    <li className="flex items-center gap-3 text-yellow-400"><FaExclamationTriangle className="flex-shrink-0"/> Límite de <strong className="text-white">3 Partidas Analizadas</strong> por día</li>
                  </ul>
                  {/* Este botón puede llevar al enlace de descarga de la app */}
                  <Link href="#download-app-link" passHref>
                    <a><EpicButton className="w-full mt-auto">Descargar Gratis</EpicButton></a>
                  </Link>
              </motion.div>

              {/* PLAN PREMIUM */}
              <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.2 }} className="bg-lol-blue-medium p-8 border-2 border-lol-blue-accent rounded-lg relative flex flex-col" style={{ boxShadow: '0 0 25px rgba(11, 198, 227, 0.5)' }}>
                  <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-lol-blue-accent text-lol-blue-dark font-bold font-display px-4 py-1 text-sm uppercase tracking-widest rounded">
                    <FaStar className="inline-block mr-2" />
                    Plan Aspirante
                  </div>
                  <h3 className="text-3xl font-display font-bold text-lol-blue-accent mb-4">Premium</h3>
                  <p className="text-lol-gold-light/70 mb-8 flex-grow">Desata todo el poder de MetaMind. Coaching ilimitado para tu ascenso a la cima.</p>
                  <ul className="space-y-4 text-lg mb-8">
                      <li className="flex items-center gap-3"><FaCheckCircle className="text-green-400" /> Acceso a <strong className="text-white">TODAS</strong> las funciones de coaching</li>
                      <li className="flex items-center gap-3"><FaCheckCircle className="text-lol-blue-accent" /> <strong className="text-white">Partidas Analizadas ILIMITADAS</strong></li>
                      <li className="flex items-center gap-3"><FaCheckCircle className="text-lol-blue-accent" /> Soporte Prioritario</li>
                      <li className="flex items-center gap-3"><FaCheckCircle className="text-lol-blue-accent" /> Acceso a futuras funciones beta</li>
                  </ul>
                  {/* IMPORTANTE: Reemplaza este 'href' con tu enlace de pago real de Hotmart */}
                  <a href="https://tu-enlace-de-pago.hotmart.com" target="_blank" rel="noopener noreferrer">
                    <EpicButton className="w-full mt-auto">¡Obtener Coaching Ilimitado!</EpicButton>
                  </a>
              </motion.div>
            </div>
        </section>

        {/* ================================================================== */}
        {/* ✅ INICIO DE LA NUEVA SECCIÓN PARA LA GUÍA                        */}
        {/* ================================================================== */}
        <section id="guide-section" className="py-20 px-4 bg-lol-blue-dark">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center max-w-3xl mx-auto"
            >
              <FaBookOpen className="text-6xl text-lol-blue-accent mx-auto mb-6" />
              <h2 className="text-4xl md:text-5xl font-display font-bold text-lol-gold mb-6 text-shadow-md">
                ¿Nuevo en MetaMind?
              </h2>
              <p className="text-lol-gold-light/80 text-lg mb-8">
                Preparamos una guía guiada por voz que te explicará paso a paso cómo desatar todo el poder de tu nuevo coach de IA. ¡Conviértete en un maestro estratega desde tu primera partida!
              </p>
              <Link href="/guia" passHref>
                {/* Envolvemos el botón en una etiqueta <a> para que el enrutamiento de Next.js funcione correctamente */}
                <a><EpicButton>Abrir Guía Interactiva</EpicButton></a>
              </Link>
            </motion.div>
          </section>
        {/* ================================================================== */}
        {/* 🏁 FIN DE LA NUEVA SECCIÓN                                        */}
        {/* ================================================================== */}

        <footer className="py-8 bg-lol-blue-dark text-center text-lol-gold-light/70 border-t-2 border-lol-gold-dark/30">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex justify-center items-center gap-6 mb-4">
                  <a href="https://www.facebook.com/SolucionesSOIN" target="_blank" rel="noopener noreferrer" className="hover:text-lol-blue-accent transition-colors">
                      <FaFacebook size={28} />
                  </a>
                  <a href="https://websoin.netlify.app/" target="_blank" rel="noopener noreferrer" className="hover:text-lol-blue-accent transition-colors">
                      <FaGlobe size={28} />
                  </a>
              </div>
              <p>Un proyecto de <strong>SO-&gt;IN Soluciones Informáticas</strong></p>
              <p>&copy; {new Date().getFullYear()} Todos los derechos reservados.</p>
            </div>
        </footer>
        </main>
      </motion.div>
    </AnimatePresence>
  );
}