'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  const wordsRef = useRef([]);

  const startTour = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    // Reinicia todo antes de empezar
    window.speechSynthesis.cancel();
    setIsPaused(false);
    
    // Une todo el texto de todas las secciones
    let fullText = '';
    let sectionBoundaries = [];
    wordsRef.current = [];

    sectionsRef.current.forEach((sectionEl, sectionIdx) => {
      if (sectionEl) {
        const textNodes = Array.from(sectionEl.querySelectorAll('.narrate'));
        const sectionText = textNodes.map(node => node.textContent).join(' \n ');
        
        sectionBoundaries.push(wordsRef.current.length);
        const sectionWords = sectionText.split(/\s+/);
        wordsRef.current.push(...sectionWords);
        fullText += sectionText + ' ';
      }
    });

    const utterance = new SpeechSynthesisUtterance(fullText.trim());
    utterance.lang = 'es-AR'; // Español (Argentina) para un acento latinoamericano.
    utterance.rate = 0.9;
    utterance.pitch = 1.1;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setCurrentWordIndex(0);
      setCurrentSectionIndex(0);
    };

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const wordIndex = wordsRef.current.slice(0, event.charIndex).join(' ').split(/\s+/).length -1;
        setCurrentWordIndex(wordIndex);

        // Auto-scroll a la sección actual
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
      setIsSpeaking(false);
      setIsPaused(false);
      setCurrentWordIndex(-1);
      setCurrentSectionIndex(-1);
    };
    
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };
  
  const togglePause = () => {
      if(isPaused) {
          window.speechSynthesis.resume();
          setIsPaused(false);
      } else {
          window.speechSynthesis.pause();
          setIsPaused(true);
      }
  };

  const stopTour = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentWordIndex(-1);
    setCurrentSectionIndex(-1);
  };

  return { startTour, stopTour, togglePause, isSpeaking, isPaused, currentWordIndex, wordsRef };
};


const GuideSection = React.forwardRef(({ icon, title, children, wordOffset, currentWordIndex }, ref) => {
    let wordCounter = 0;
    const processNode = (node) => {
        if (node.type === 'p' || node.type === 'li' || node.type === 'strong') {
            const textContent = node.props.children;
            if (typeof textContent === 'string') {
                return (
                    <span className="narrate">
                        {textContent.split(/\s+/).map((word, i) => {
                            const globalWordIndex = wordOffset + wordCounter + i;
                            const isCurrent = globalWordIndex === currentWordIndex;
                            return (
                                <span key={i} className={`transition-colors duration-150 ${isCurrent ? 'bg-yellow-400 text-black rounded-sm' : ''}`}>
                                    {word}{' '}
                                </span>
                            );
                        })}
                    </span>
                );
            }
        }
        if (React.isValidElement(node) && node.props.children) {
             const children = React.Children.map(node.props.children, processNode);
             return React.cloneElement(node, {}, children);
        }
        return node;
    };
    
    const highlightedChildren = React.Children.map(children, (child) => {
        const processedChild = processNode(child);
        const childText = child.props.children;
        if (typeof childText === 'string') {
            wordCounter += childText.split(/\s+/).length;
        }
        return processedChild;
    });

  return (
    <div ref={ref} className="bg-lol-blue-medium p-6 md:p-8 border border-lol-gold-dark/30 rounded-lg">
      <div className="flex items-center mb-4">
        <div className="text-3xl text-lol-blue-accent mr-4">{icon}</div>
        <h3 className="text-2xl font-display font-bold text-lol-gold">{title}</h3>
      </div>
      <div className="text-lol-gold-light/80 space-y-4 leading-relaxed">
        {highlightedChildren}
      </div>
    </div>
  );
});
GuideSection.displayName = "GuideSection";


export default function GuidePage() {
  const sectionsRef = useRef([]);
  const { startTour, stopTour, togglePause, isSpeaking, isPaused, currentWordIndex, wordsRef } = useGuidedTour(sectionsRef);

  // Este es el efecto clave. Se ejecuta una vez cuando el componente se monta EN EL CLIENTE.
  useEffect(() => {
    setIsClient(true); // Marcamos que ya estamos en el lado del cliente y la hidratación ha ocurrido.
  }, []);

  // Este segundo efecto se ejecutará DESPUÉS del primero, solo cuando 'isClient' sea true.
  useEffect(() => {
    // Si no estamos en el cliente, no hacemos nada.
    if (!isClient) return;

    // Ahora que estamos seguros de que la hidratación terminó, podemos iniciar la lógica del TTS.
    const startTimeout = setTimeout(startTour, 1000);

    // La función de limpieza se mantiene igual.
    return () => {
      clearTimeout(startTimeout);
      stopTour();
    };
  }, [isClient, startTour, stopTour]); // Dependencias correctas

  const sectionsContent = [
    { icon: <FaPlayCircle />, title: 'Paso 1: Arranque Automático', 
      content: [
          <p key="1">Simplemente mantén MetaMind abierto mientras juegas. Nuestra aplicación detectará automáticamente en qué fase del juego te encuentras. ¡No necesitas hacer nada más para empezar!</p>
      ]
    },
    { icon: <FaUserCheck />, title: 'Paso 2: Coach Pre-Partida',
      content: [
          <p key="1">Al entrar en la sala de espera, tu Overlay cobrará vida. En este momento, la IA analiza tu perfil para prepararte mental y tácticamente.</p>,
          <p key="2" className="font-semibold text-lol-gold-light">Escucharás tu "briefing de misión": un mantra para tu estado mental y un objetivo claro para los primeros minutos.</p>
      ]
    },
    { icon: <FaKeyboard />, title: 'Paso 3: El Coach de Draft',
      content: [
          <p key="1">Al entrar en Selección de Campeones, recibirás un <strong className="text-white">análisis general automático</strong> al detectarse el primer pick o ban.</p>,
          <div key="2">
              <p className="font-semibold text-lol-gold-light mb-2">Análisis a Demanda (Tu Arma Secreta):</p>
              <ol className="list-decimal list-inside space-y-2 pl-4">
                <li key="2a"><strong className="text-white">Pre-selecciona</strong> el campeón que tienes en mente.</li>
                <li key="2b">El botón morado <strong className="text-white">"Analizar a [Campeón]"</strong> se activará. ¡Hazle clic!</li>
                <li key="2c">Recibirás un plan de juego actualizado y el botón <strong className="text-white">"Inyectar Runas"</strong> para importar la página de runas.</li>
              </ol>
          </div>,
          <p key="3" className="text-sm italic text-gray-400">Consejo Pro: ¿Dudas entre dos campeones? ¡Analiza ambos! Compara los consejos y toma la mejor decisión.</p>
      ]
    },
    { icon: <FaHeadphones />, title: 'Paso 4: Coach en Vivo',
      content: [
          <p key="1">Una vez en partida, el Overlay cambiará al modo "Coach en Vivo". Periódicamente, la IA analizará el estado del juego y te dará consejos de audio cortos y directos sobre macrojuego y objetivos.</p>
      ]
    },
    { icon: <FaBrain />, title: 'Paso 5: Aprendizaje Continuo',
      content: [
          <p key="1">Al terminar la partida, MetaMind analiza el resultado en segundo plano. Tu perfil de rendimiento se actualiza, permitiendo que la IA aprenda de tus jugadas para darte consejos cada vez más precisos.</p>
      ]
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

        {/* Controles de Audio */}
        <div className="sticky top-4 z-50 mb-12">
            <div className="flex justify-center items-center gap-4 bg-black/50 backdrop-blur-md p-3 rounded-xl max-w-xs mx-auto border border-lol-gold/30">
                {isSpeaking && (
                    <button onClick={togglePause} title={isPaused ? "Reanudar" : "Pausar"} className="text-white text-3xl hover:text-yellow-400 transition-colors">
                        {isPaused ? <FaPlayCircle /> : <FaPauseCircle />}
                    </button>
                )}
                <button onClick={stopTour} title="Detener y Reiniciar" className="text-white text-3xl hover:text-red-500 transition-colors">
                    <FaStopCircle />
                </button>
            </div>
        </div>

        <div className="space-y-12">
          {sectionsContent.map((section, index) => {
            const currentOffset = globalWordCount;
            const sectionText = section.content.map(c => c.props.children).flat().join(' ');
            globalWordCount += sectionText.split(/\s+/).length;

            return (
              <GuideSection 
                key={index} 
                icon={section.icon} 
                title={section.title}
                wordOffset={currentOffset}
                currentWordIndex={currentWordIndex}
                ref={el => sectionsRef.current[index] = el}
              >
                  {section.content}
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