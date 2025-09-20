'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';

// El formulario ahora recibe al usuario actual como prop
export default function ProfileForm({ currentUser }) {
  const [status, setStatus] = useState('idle');
  const [recommendation, setRecommendation] = useState(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const zodiacSigns = [
    'Aries', 'Tauro', 'Géminis', 'Cáncer', 'Leo', 'Virgo',
    'Libra', 'Escorpio', 'Sagitario', 'Capricornio', 'Acuario', 'Piscis'
  ];

  const onSubmit = async (data) => {
    setStatus('loading');
    setRecommendation(null);
    
    // Combinamos los datos del usuario vinculado con el signo zodiacal del formulario
    const playerData = {
      summonerName: currentUser.riot_id_name,
      tagLine: currentUser.riot_id_tagline,
      region: currentUser.region,
      zodiacSign: data.zodiacSign
    };

    try {
      const response = await fetch('/api/recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playerData),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'La respuesta de la IA no fue exitosa');
      }

      const result = await response.json();
      setRecommendation(result);
      setStatus('success');
    } catch (error) {
      console.error('Error al enviar el formulario:', error);
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-lol-blue-medium text-lol-gold-light p-8 rounded-xl shadow-lg w-full text-center animate-pulse border-2 border-lol-gold-dark"
      >
        <h2 className="text-2xl font-display font-bold text-lol-blue-accent mb-4">Analizando tu Perfil Cósmico...</h2>
        <p className="text-lol-gold-light/90">La IA está consultando los astros y tu perfil de Riot para encontrar tu campeón ideal.</p>
      </motion.div>
    );
  }

  if (status === 'success' && recommendation) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-lol-blue-medium text-lol-gold-light p-8 rounded-xl shadow-lg w-full border-2 border-lol-gold-dark"
      >
        <h2 className="text-2xl font-display font-bold text-lol-blue-accent mb-4 text-center">¡Análisis de IA Completo!</h2>
        <div className="space-y-4 mt-6">
          <div className="bg-lol-blue-dark p-4 rounded-lg border border-lol-gold-dark">
            <h3 className="text-xl font-display font-bold text-lol-gold mb-2">Recomendación para {currentUser.riot_id_name}</h3>
            <p><strong className="font-semibold text-lol-gold-light">Campeón Sugerido:</strong> <span className="text-lol-blue-accent font-bold">{recommendation.champion}</span></p>
            <p><strong className="font-semibold text-lol-gold-light">Rol:</strong> <span className="text-green-400">{recommendation.role}</span></p>
            <p><strong className="font-semibold text-lol-gold-light">Arquetipo:</strong> <span className="text-purple-400">{recommendation.archetype}</span></p>
          </div>
          <div className="bg-lol-blue-dark p-4 rounded-lg border border-lol-gold-dark">
            <strong className="text-xl font-display font-bold text-lol-gold block mb-2">Consejos Estratégicos:</strong>
            <ul className="list-disc list-inside space-y-2 text-lol-gold-light/80">
              {recommendation.strategicAdvice.map((advice, index) => <li key={index}><strong>{advice.type}:</strong> {advice.content}</li>)}
            </ul>
          </div>
        </div>
        <button
          onClick={() => setStatus('idle')}
          className="w-full mt-8 bg-lol-gold hover:bg-lol-gold-dark text-lol-blue-dark font-display font-bold py-3 px-4 rounded-lg"
        >
          Realizar otro Análisis
        </button>
      </motion.div>
    );
  }

  return (
    <div className="bg-lol-blue-medium text-lol-gold-light p-8 rounded-xl shadow-lg w-full border-2 border-lol-gold-dark">
      <h2 className="text-2xl font-display font-bold text-lol-blue-accent mb-1">Análisis de IA</h2>
      <p className="text-lol-gold-light/90 mb-6">Tu Riot ID <strong className="text-lol-blue-accent">{currentUser.riot_id_name}#{currentUser.riot_id_tagline}</strong> está listo. Solo falta un detalle.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="zodiacSign" className="block text-sm font-medium text-lol-gold-light mb-2">Signo Zodiacal</label>
          <select
            id="zodiacSign"
            {...register("zodiacSign", { required: "Tu signo zodiacal es necesario para el análisis." })}
            className="w-full bg-lol-blue-dark border-2 border-lol-gold-dark rounded-lg px-4 py-2"
          >
            <option value="">-- Selecciona tu signo --</option>
            {zodiacSigns.map(sign => <option key={sign} value={sign}>{sign}</option>)}
          </select>
          {errors.zodiacSign && <p className="text-red-500 text-xs mt-1">{errors.zodiacSign.message}</p>}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-lol-gold hover:bg-lol-gold-dark text-lol-blue-dark font-display font-bold py-3 px-4 rounded-lg"
        >
          {isSubmitting ? 'La IA está trabajando...' : 'Obtener Recomendación'}
        </button>
      </form>
    </div>
  );
}
