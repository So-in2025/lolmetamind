'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const styles = {
  container: "bg-lol-blue-dark/50 text-lol-gold-light p-4 rounded-lg shadow-lg w-full max-w-md mx-auto border-2 border-lol-gold-dark backdrop-blur-md",
  title: "text-lg font-display font-bold text-lol-blue-accent mb-3 text-center -webkit-app-region-drag",
  tipContainer: "p-3 rounded-lg border border-lol-gold-dark min-h-[80px] flex items-center justify-center text-center",
  tipText: "text-base font-body text-lol-gold-light transition-opacity duration-500",
};

export default function RealtimeCoachHUD({ message }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(false);
      setTimeout(() => {
        setIsVisible(true);
        // Lógica de narración de voz
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(message);
          const spanishVoice = window.speechSynthesis.getVoices().find(voice => voice.lang === 'es-ES' || voice.lang === 'es-MX' || voice.lang.startsWith('es'));
          if (spanishVoice) {
            utterance.voice = spanishVoice;
          }
          window.speechSynthesis.speak(utterance);
        }
      }, 500);
    }
  }, [message]);

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Coach en Vivo</h3>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className={styles.tipContainer}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <p className={styles.tipText}>{message}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
