'use client';

import React, { useState, useEffect, useRef, forwardRef, useCallback } from 'react'; // Importa 'forwardRef' y 'useCallback'
import { motion } from 'framer-motion';
import { FaPlayCircle, FaUserCheck, FaKeyboard, FaBrain, FaHeadphones, FaPauseCircle, FaStopCircle } from 'react-icons/fa';
import Link from 'next/link';

// Hook personalizado para manejar la lógica del TTS y el resaltado
const useGuidedTour = (sectionsRef) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(-1);
  const utteranceRef = useRef(null);
  
  // ✅ CORRECCIÓN: Envolvemos las funciones en useCallback para optimización y evitar re-creaciones innecesarias.
  const stopTour = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentWordIndex(-1);
    setCurrentSectionIndex(-1);
  }, []);

  const startTour = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    stopTour(); // Llama a la función de reseteo
    
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
    utterance.lang = 'es-AR';
    utterance.rate = 0.9;
    utterance.pitch = 1.1;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setCurrentWordIndex(0);
      setCurrentSectionIndex(0);
    };

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const spokenText = fullText.substring(0, event.charIndex + event.charLength);
        const wordIndex = spokenText.split(/\s+/).filter(Boolean).length - 1;
        setCurrentWordIndex(wordIndex);

        const newSectionIndex = sectionBoundaries.findIndex((start, i) => {
            const end = sectionBoundaries[i + 1] || Infinity;
            return wordIndex >= start && wordIndex < end;
        });
        if (newSectionIndex !== -1 && newSectionIndex !== currentSectionIndex) {
            setCurrentSectionIndex(newSectionIndex);
            sectionsRef.current[newSectionIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    };

    utterance.onend = () => {
      stopTour();
    };
    
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [sectionsRef, stopTour, currentSectionIndex]);
  
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
  const [isClient, setIsClient] = useState(false); // ✅ CORRECCIÓN: Esta línea faltaba en tu código original.

  // Efecto para marcar que estamos en el cliente y la hidratación ha ocurrido.
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Efecto para iniciar el tour automáticamente una vez que estamos en el cliente.
  useEffect(() => {
    if (!isClient) return;
    const startTimeout = setTimeout(startTour, 1000);
    return () => {
      clearTimeout(startTimeout);
      stopTour();
    };
  }, [isClient, startTour, stopTour]);

  const sectionsContent = [
    // ... (Tu contenido original, sin cambios)
    { icon: <FaPlayCircle />, title: 'Paso 1: Arranque Automático', text: "Simplemente mantén MetaMind abierto mientras juegas. Nuestra aplicación detectará automáticamente en qué fase del juego te encuentras. ¡No necesitas hacer nada más para empezar!" },
    { icon: <FaUserCheck />, title: 'Paso 2: Coach Pre-Partida', text: "Al entrar en la sala de espera, tu Overlay cobrará vida. En este momento, la IA analiza tu perfil para prepararte mental y tácticamente. Escucharás tu \"briefing de misión\": un mantra para tu estado mental y un objetivo claro para los primeros minutos." },
    { icon: <FaKeyboard />, title: 'Paso 3: El Coach de Draft', text: "Al entrar en Selección de Campeones, recibirás un análisis general automático. Luego, pre-selecciona un campeón para activar el botón 'Analizar'. Al hacer clic, recibirás un plan de juego actualizado y el botón para inyectar las runas. Consejo Pro: ¿Dudas entre dos campeones? ¡Analiza ambos!" },
    { icon: <FaHeadphones />, title: 'Paso 4: Coach en Vivo', text: "Una vez en partida, el Overlay cambiará al modo \"Coach en Vivo\". Periódicamente, la IA analizará el estado del juego y te dará consejos de audio cortos y directos sobre macrojuego y objetivos." },
    { icon: <FaBrain />, title: 'Paso 5: Aprendizaje Continuo', text: "Al terminar la partida, MetaMind analiza el resultado en segundo plano. Tu perfil de rendimiento se actualiza, permitiendo que la IA aprenda de tus jugadas para darte consejos cada vez más precisos." }
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