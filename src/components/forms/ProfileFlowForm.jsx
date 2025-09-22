'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';

// Este componente ahora maneja AMBOS pasos del flujo.
export default function ProfileFlowForm({ hasProfile, onProfileUpdate, currentUser }) {
  
  // Estado para el formulario de vinculación
  const { register: registerSummoner, handleSubmit: handleSummonerSubmit, formState: { errors: summonerErrors, isSubmitting: isSubmittingSummoner }, getValues } = useForm();
  const [apiError, setApiError] = useState('');
  const [showSimulationButton, setShowSimulationButton] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  
  // Estado para el formulario de análisis de IA
  const { register: registerZodiac, handleSubmit: handleZodiacSubmit, formState: { errors: zodiacErrors, isSubmitting: isSubmittingZodiac } } = useForm();
  const [status, setStatus] = useState('idle');
  const [recommendation, setRecommendation] = useState(null);
  const { token } = useAuth();
  
  const regions = ['LAS', 'LAN', 'NA', 'EUW', 'EUNE', 'KR', 'JP'];
  const zodiacSigns = ['Aries', 'Tauro', 'Géminis', 'Cáncer', 'Leo', 'Virgo', 'Libra', 'Escorpio', 'Sagitario', 'Capricornio', 'Acuario', 'Piscis'];

  // Lógica para vincular el perfil
  const onLinkSubmit = async (data) => {
    setApiError('');
    setShowSimulationButton(false);
    try {
      const cleanTagLine = data.tagLine.startsWith('#') ? data.tagLine.substring(1) : data.tagLine;
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...data, tagLine: cleanTagLine }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo actualizar el perfil.');
      
      alert('¡Perfil de invocador vinculado con éxito!');
      if(onProfileUpdate) onProfileUpdate(result.user);

    } catch (err) {
      setApiError(err.message);
      setShowSimulationButton(true);
    }
  };

  // Lógica para la simulación
  const handleSimulation = async () => {
    setIsSimulating(true);
    setApiError('');
    const data = getValues();
    try {
        const cleanTagLine = data.tagLine.startsWith('#') ? data.tagLine.substring(1) : data.tagLine;
        const response = await fetch('/api/user/profile/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ ...data, tagLine: cleanTagLine }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No se pudo crear el perfil simulado.');

        alert('¡Modo de simulación activado! Perfil simulado vinculado con éxito.');
        if(onProfileUpdate) onProfileUpdate(result.user);

    } catch (err) {
        setApiError(err.message);
    } finally {
        setIsSimulating(false);
    }
  };

  // Lógica para obtener recomendación de la IA
  const onZodiacSubmit = async (data) => {
    setStatus('loading');
    setRecommendation(null);
    try {
      const response = await fetch('/api/recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ zodiacSign: data.zodiacSign }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'La respuesta de la IA no fue exitosa');
      }
      const result = await response.json();
      setRecommendation(result);
      setStatus('success');
    } catch (error) {
      setStatus('error');
    }
  };
  
  // --- RENDERIZADO CONDICIONAL ---

  // Si el perfil ya está vinculado, mostramos el formulario de IA
  if (hasProfile) {
    if (status === 'loading') {
      return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-lol-blue-medium text-lol-gold-light p-8 rounded-xl shadow-lg w-full text-center animate-pulse border-2 border-lol-gold-dark">
          <h2 className="text-2xl font-display font-bold text-lol-blue-accent mb-4">Analizando tu Perfil Cósmico...</h2>
          <p className="text-lol-gold-light/90">La IA está consultando los astros y tu perfil de Riot para entregar tu plan de acción diario.</p>
        </motion.div>
      );
    }

    if (status === 'success' && recommendation) {
      return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-lol-blue-medium text-lol-gold-light p-8 rounded-xl shadow-lg w-full border-2 border-lol-gold-dark">
          <h2 className="text-3xl font-display font-bold text-lol-blue-accent mb-6 text-center">Plan de Acción para {currentUser.riot_id_name}</h2>
          {/* ... (Aquí iría el resto de la UI de resultados, que ya tenías bien) ... */}
           <button onClick={() => setStatus('idle')} className="w-full mt-8 bg-lol-gold hover:bg-lol-gold-dark text-lol-blue-dark font-display font-bold py-3 px-4 rounded-lg">Realizar otro Análisis</button>
        </motion.div>
      );
    }

    return ( // Formulario de Zodiaco
      <div className="bg-lol-blue-medium text-lol-gold-light p-8 rounded-xl shadow-lg w-full border-2 border-lol-gold-dark">
        <h2 className="text-2xl font-display font-bold text-lol-blue-accent mb-1">Análisis de IA</h2>
        <p className="text-lol-gold-light/90 mb-6">Tu Riot ID <strong className="text-lol-blue-accent">{currentUser.riot_id_name}#{currentUser.riot_id_tagline}</strong> está listo. Solo falta un detalle.</p>
        <form onSubmit={handleZodiacSubmit(onZodiacSubmit)} className="space-y-6">
          <div>
            <label htmlFor="zodiacSign" className="block text-sm font-medium text-lol-gold-light mb-2">Signo Zodiacal</label>
            <select id="zodiacSign" {...registerZodiac("zodiacSign", { required: "Tu signo zodiacal es necesario." })} className="w-full bg-lol-blue-dark border-2 border-lol-gold-dark rounded-lg px-4 py-2">
              <option value="">-- Selecciona tu signo --</option>
              {zodiacSigns.map(sign => <option key={sign} value={sign}>{sign}</option>)}
            </select>
            {zodiacErrors.zodiacSign && <p className="text-red-500 text-xs mt-1">{zodiacErrors.zodiacSign.message}</p>}
          </div>
          <button type="submit" disabled={isSubmittingZodiac} className="w-full bg-lol-gold hover:bg-lol-gold-dark text-lol-blue-dark font-display font-bold py-3 px-4 rounded-lg">
            {isSubmittingZodiac ? 'La IA está trabajando...' : 'Obtener Recomendación'}
          </button>
        </form>
      </div>
    );
  }

  // Si NO hay perfil, mostramos el formulario de vinculación
  return (
    <div className="bg-lol-blue-medium text-lol-gold-light p-8 rounded-xl shadow-lg w-full border-2 border-lol-gold-dark">
      <h2 className="text-2xl font-display font-bold text-lol-blue-accent mb-2">Vincula tu Riot ID</h2>
      <p className="text-lol-gold-light/90 mb-6">
        Ingresa tu nombre de juego y tu tagline para activar el coaching. Lo encontrarás pasando el mouse sobre tu avatar en el cliente de Riot.
      </p>
      {apiError && <p className="bg-red-900/50 text-red-300 border border-red-500 rounded-md p-3 text-center mb-4">{apiError}</p>}
      <form onSubmit={handleSummonerSubmit(onLinkSubmit)} className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow">
            <label htmlFor="gameName" className="block text-sm font-medium mb-2">Nombre de Juego</label>
            <input id="gameName" placeholder="Ej: Faker" {...registerSummoner("gameName", { required: "El nombre es requerido." })} className="w-full bg-lol-blue-dark border-2 border-lol-gold-dark rounded-lg px-4 py-2" />
            {summonerErrors.gameName && <p className="text-red-500 text-xs mt-1">{summonerErrors.gameName.message}</p>}
          </div>
          <div className="w-full md:w-1/3">
            <label htmlFor="tagLine" className="block text-sm font-medium mb-2">Tagline</label>
            <input id="tagLine" placeholder="KR1" {...registerSummoner("tagLine", { required: "El tagline es requerido." })} className="w-full bg-lol-blue-dark border-2 border-lol-gold-dark rounded-lg px-4 py-2" />
            {summonerErrors.tagLine && <p className="text-red-500 text-xs mt-1">{summonerErrors.tagLine.message}</p>}
          </div>
        </div>
        <div>
          <label htmlFor="region" className="block text-sm font-medium mb-2">Región de Juego</label>
          <select id="region" {...registerSummoner("region", { required: "Debes seleccionar una región." })} className="w-full bg-lol-blue-dark border-2 border-lol-gold-dark rounded-lg px-4 py-2">
            {regions.map(region => <option key={region} value={region}>{region}</option>)}
          </select>
          {summonerErrors.region && <p className="text-red-500 text-xs mt-1">{summonerErrors.region.message}</p>}
        </div>
        <button type="submit" disabled={isSubmittingSummoner} className="w-full bg-lol-gold hover:bg-lol-gold-dark text-lol-blue-dark font-display font-bold py-3 px-4 rounded-lg disabled:opacity-50">
          {isSubmittingSummoner ? 'Verificando...' : 'Vincular y Guardar'}
        </button>
      </form>
      
      {showSimulationButton && (
        <div className="mt-4 text-center">
            <p className="text-sm text-lol-gold-light/70 mb-2">Aún no estamos conectados con Riot.</p>
            <button onClick={handleSimulation} disabled={isSimulating} className="w-full bg-lol-blue-accent hover:bg-cyan-500 text-lol-blue-dark font-display font-bold py-3 px-4 rounded-lg disabled:opacity-50">
                {isSimulating ? 'Simulando...' : '¿Quieres avanzar con una simulación?'}
            </button>
        </div>
      )}
    </div>
  );
}