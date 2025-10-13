'use client';

import React, { useState, useEffect, useRef, forwardRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FaPlayCircle, FaUserCheck, FaKeyboard, FaBrain, FaHeadphones, FaPauseCircle, FaStopCircle } from 'react-icons/fa';
import Link from 'next/link';

// ====================================================================================
// ✅ HOOK useGuidedTour CORREGIDO (ROMPE EL BUCLE INFINITO)
// ====================================================================================
const useGuidedTour = (sectionsRef) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(-1);
  const utteranceRef = useRef(null);
  
  // ✅ 1. Usamos un Ref para rastrear el índice de la sección sin causar re-renders.
  const sectionIndexRef = useRef(currentSectionIndex);
  useEffect(() => {
    sectionIndexRef.current = currentSectionIndex;
  }, [currentSectionIndex]);

  const stopTour = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentWordIndex(-1);
    setCurrentSectionIndex(-1);
  }, []);

  const startTour = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    stopTour();
    
    let fullText = '';
    let sectionBoundaries = [];
    let words = [];

    sectionsRef.current.forEach((sectionEl) => {
      if (sectionEl) {
        const textNodes = Array.from(sectionEl.querySelectorAll('.narrate'));
        const sectionText = textNodes.map(node => node.textContent).join(' \n ');
        sectionBoundaries.push(words.length);
        const sectionWords = sectionText.split(/\s+/).filter(Boolean);
        words.push(...sectionWords);
        fullText += sectionText + ' ';
      }
    });

    const utterance = new SpeechSynthesisUtterance(fullText.trim());
    utterance.lang = 'es-ES';
    utterance.rate = 0.95;
    utterance.pitch = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        let charCounter = 0;
        for (let i = 0; i < words.length; i++) {
          charCounter += words[i].length + 1;
          if (charCounter > event.charIndex) {
            setCurrentWordIndex(i);
            const newSectionIndex = sectionBoundaries.findIndex((start, j) => {
              const end = sectionBoundaries[j + 1] || Infinity;
              return i >= start && i < end;
            });
            // ✅ 2. Leemos desde el Ref en lugar del estado para evitar la dependencia.
            if (newSectionIndex !== -1 && newSectionIndex !== sectionIndexRef.current) {
              setCurrentSectionIndex(newSectionIndex);
              sectionsRef.current[newSectionIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
          }
        }
      }
    };

    utterance.onend = () => {
      stopTour();
    };
    
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  // ✅ 3. Eliminamos 'currentSectionIndex' de las dependencias para romper el bucle.
  }, [sectionsRef, stopTour]);
  
  const togglePause = useCallback(() => {
      if(window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
          setIsPaused(false);
      } else {
          window.speechSynthesis.pause();
          setIsPaused(true);
      }
  }, []);

  return { startTour, stopTour, togglePause, isSpeaking, isPaused, currentWordIndex };
};

// ====================================================================================
// RESTO DEL CÓDIGO (SIN CAMBIOS)
// ====================================================================================

const GuideSection = forwardRef(({ icon, title, children }, ref) => {
  return (
    <motion.div 
        ref={ref}
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.8 }}
        className="bg-lol-blue-medium p-6 md:p-8 border border-lol-gold-dark/30 rounded-lg"
    >
      <div className="flex items-center mb-4">
        <div className="text-3xl text-lol-blue-accent mr-4">{icon}</div>
        <h3 className="text-2xl font-display font-bold text-lol-gold">{title}</h3>
      </div>
      <div className="text-lol-gold-light/80 space-y-4 leading-relaxed">
        {children}
      </div>
    </motion.div>
  );
});
GuideSection.displayName = "GuideSection";


const NarratedText = ({ text, wordOffset, currentWordIndex }) => {
    const words = text.split(/\s+/).filter(Boolean);
    return (
        <span className="narrate">
            {words.map((word, i) => {
                const globalWordIndex = wordOffset + i;
                const isCurrent = globalWordIndex === currentWordIndex;
                return (
                    <span key={i} className={`transition-colors duration-100 ${isCurrent ? 'bg-yellow-400 text-black rounded' : ''}`}>
                        {word}{' '}
                    </span>
                );
            })}
        </span>
    );
};


export default function GuidePage() {
  const sectionsRef = useRef([]);
  const { startTour, stopTour, togglePause, isSpeaking, isPaused, currentWordIndex } = useGuidedTour(sectionsRef);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    const startTimeout = setTimeout(startTour, 1000);
    return () => {
      clearTimeout(startTimeout);
      stopTour();
    };
  }, [isClient, startTour, stopTour]);

  const sectionsContent = [
    { 
      icon: <FaPlayCircle />, 
      title: 'Paso 1: Arranque Automático', 
      text: "Simplemente mantén MetaMind abierto mientras juegas a League of Legends. ¡Eso es todo! Nuestra aplicación detectará automáticamente en qué fase del juego te encuentras. No necesitas activar ni configurar nada para empezar." 
    },
    { 
      icon: <FaUserCheck />, 
      title: 'Paso 2: El Coach Pre-Partida', 
      text: "En cuanto entres en una sala de espera, verás que el Overlay cobra vida. En este momento, nuestra IA analiza tu perfil para prepararte mental y tácticamente. Recibirás un consejo de audio inicial. Este es tu \"briefing de misión\": un mantra para tu estado mental y un objetivo claro para los primeros minutos. ¡Escúchalo con atención!" 
    },
    { 
      icon: <FaKeyboard />, 
      title: 'Paso 3: El Coach de Draft', 
      text: "Al entrar en Selección de Campeones, recibirás un análisis general automático sobre las necesidades de tu equipo. Luego, es tu momento de brillar. Pre-selecciona el campeón que tienes en mente para activar el botón 'Analizar'. Al hacer clic, recibirás una estrategia completa y específica sobre sinergias, enfrentamientos y tu condición de victoria. Si la IA lo recomienda, también aparecerá el botón para inyectar las runas con un solo clic. Consejo Profesional: ¿No estás seguro entre dos campeones? ¡Analiza ambos y compara los planes de juego!" 
    },
    { 
      icon: <FaHeadphones />, 
      title: 'Paso 4: El Coach en Vivo', 
      text: "Una vez en partida, MetaMind no te abandona. Periódicamente, nuestra IA tomará una 'foto' de la situación: tu nivel, ítems y objetivos. Recibirás consejos de audio cortos y relevantes como: 'Acabas de volver a base con 1500 de oro. Prioriza la compra del Brillo', o 'El Dragón aparecerá en un minuto. Comienza a establecer visión en la zona'." 
    },
    { 
      icon: <FaBrain />, 
      title: 'Paso 5: El Análisis Post-Partida', 
      text: "Al terminar la partida, en segundo plano, nuestra IA analiza el resultado y actualiza tu perfil de rendimiento, aprendiendo de tus fortalezas y debilidades. Este análisis se usará para darte consejos aún más personalizados en tu próxima partida." 
    }
  ];
  
  let globalWordCount = 0;

  return (
    <div className="min-h-screen bg-lol-blue-dark text-lol-gold-light font-body bg-[url('/img/background.webp')] bg-cover bg-center bg-fixed">
      <main className="max-w-4xl mx-auto px-4 py-20 sm:py-28">
        <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-display font-extrabold text-lol-gold-light text-shadow-lg">Guía Guiada por Voz</h1>
          <p className="mt-4 text-md md:text-xl max-w-2xl mx-auto text-lol-gold-light/90 text-shadow-md">Relájate y escucha mientras te explicamos cómo dominar el juego con MetaMind.</p>
        </motion.div>

        {isClient && (
          <div className="sticky top-4 z-50 mb-12">
            <div className="flex justify-center items-center gap-4 bg-black/50 backdrop-blur-md p-3 rounded-xl max-w-xs mx-auto border border-lol-gold/30">
                {(isSpeaking || isPaused) ? (
                  <>
                    <button onClick={togglePause} title={isPaused ? "Reanudar" : "Pausar"} className="text-white text-3xl hover:text-yellow-400 transition-colors">
                        {isPaused ? <FaPlayCircle /> : <FaPauseCircle />}
                    </button>
                    <button onClick={stopTour} title="Detener y Reiniciar" className="text-white text-3xl hover:text-red-500 transition-colors">
                        <FaStopCircle />
                    </button>
                  </>
                ) : (
                    <button onClick={startTour} title="Iniciar Narración" className="text-white text-3xl hover:text-green-400 transition-colors">
                        <FaPlayCircle />
                    </button>
                )}
            </div>
          </div>
        )}

        <div className="space-y-12">
          {sectionsContent.map((section, index) => {
            const currentOffset = globalWordCount;
            const sectionWords = section.text.split(/\s+/).filter(Boolean);
            globalWordCount += sectionWords.length;

            return (
              <GuideSection 
                key={index} 
                icon={section.icon} 
                title={section.title}
                ref={el => sectionsRef.current[index] = el}
              >
                  <p><NarratedText text={section.text} wordOffset={currentOffset} currentWordIndex={currentWordIndex} /></p>
              </GuideSection>
            )
          })}
        </div>
        
        <div className="text-center mt-20">
          <Link href="/" passHref>
            <motion.a whileHover={{ scale: 1.05 }} className="text-lol-blue-accent font-bold hover:text-white transition-colors">&larr; Volver a la página principal</motion.a>
          </Link>
        </div>
      </main>
    </div>
  );
}