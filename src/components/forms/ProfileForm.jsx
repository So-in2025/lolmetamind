'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function ProfileForm() {
  const [status, setStatus] = useState('idle');
  const [recommendation, setRecommendation] = useState(null);
  const [clipStatus, setClipStatus] = useState('idle');
  const [postMatchAnalysis, setPostMatchAnalysis] = useState(null);
  const [customBuild, setCustomBuild] = useState(null);
  const { register, handleSubmit, formState: { errors } } = useForm();
  const regions = ['LAN', 'LAS', 'NA', 'EUW', 'EUNE', 'KR', 'JP'];
  const zodiacSigns = [
    'Aries', 'Tauro', 'Géminis', 'Cáncer', 'Leo', 'Virgo',
    'Libra', 'Escorpio', 'Sagitario', 'Capricornio', 'Acuario', 'Piscis'
  ];
  const onSubmit = async (data) => {
    setStatus('loading');
    setRecommendation(null);
    setPostMatchAnalysis(null);
    setCustomBuild(null);
    try {
      const response = await fetch('/api/recommendation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('La respuesta de la API no fue exitosa');
      }
      const result = await response.json();
      setRecommendation(result);
      setStatus('success');
    } catch (error) {
      console.error('Error al enviar el formulario:', error);
      setStatus('error');
    }
  };
  
  const handleGenerateClip = async () => {
    setClipStatus('loading');
    try {
      const response = await fetch('/api/clips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: 120,
          duration: 15,
          brandingText: 'SOIN LoL MetaMind'
        }),
      });
      if (!response.ok) {
        throw new Error('La respuesta de la API de clips no fue exitosa');
      }
      const result = await response.json();
      console.log('Respuesta de la API de clips:', result);
      setClipStatus('success');
      setTimeout(() => setClipStatus('idle'), 5000);
    } catch (error) {
      console.error('Error al generar el clip:', error);
      setClipStatus('error');
    }
  };
  
  const handleGetPostMatchAnalysis = async () => {
    try {
      const response = await fetch('/api/analysis/post-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ matchId: '123456789' }),
      });
      const result = await response.json();
      setPostMatchAnalysis(result);
    } catch (error) {
      console.error('Error al obtener el análisis post-partida:', error);
    }
  };
  
  const handleGetCustomBuild = async () => {
    try {
      const response = await fetch('/api/builds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ matchData: {} }),
      });
      const result = await response.json();
      setCustomBuild(result);
    } catch (error) {
      console.error('Error al obtener la build personalizada:', error);
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
        <p className="text-lol-gold-light/90">Consultando a los astros y los servidores de Riot para encontrar tu campeón ideal.</p>
      </motion.div>
    );
  }
  if (status === 'success' && recommendation) {
    return (
      <div className="bg-lol-blue-medium text-lol-gold-light p-8 rounded-xl shadow-lg w-full border-2 border-lol-gold-dark">
        <h2 className="text-2xl font-display font-bold text-lol-blue-accent mb-4 text-center">¡Análisis Listo!</h2>
        <div className="space-y-4 mt-6">
          <div className="bg-lol-blue-dark p-4 rounded-lg border border-lol-gold-dark">
            <h3 className="text-xl font-display font-bold text-lol-gold mb-2">Recomendación de Campeón</h3>
            <p className="text-lg"><strong className="font-semibold text-lol-gold-light">Campeón:</strong> <span className="text-lol-blue-accent font-bold">{recommendation.champion}</span></p>
            <p className="text-lg"><strong className="font-semibold text-lol-gold-light">Rol:</strong> <span className="text-green-400">{recommendation.role}</span></p>
            <p className="text-lg"><strong className="font-semibold text-lol-gold-light">Arquetipo:</strong> <span className="text-purple-400">{recommendation.archetype}</span></p>
          </div>
          <div className="bg-lol-blue-dark p-4 rounded-lg border border-lol-gold-dark">
            <h3 className="text-xl font-display font-bold text-lol-gold mb-2">Análisis de Equipo</h3>
            <p className="text-sm"><strong className="font-semibold text-lol-gold-light">Fortalezas:</strong> {recommendation.teamAnalysis.strength}</p>
            <p className="text-sm mt-2"><strong className="font-semibold text-lol-gold-light">Debilidades Enemigas:</strong></p>
            <ul className="list-disc list-inside mt-1 space-y-1 text-lol-gold-light/80 text-sm">
              {recommendation.enemyWeaknesses.map((weakness, index) => <li key={index}>{weakness}</li>)}
            </ul>
          </div>
          <div className="bg-lol-blue-dark p-4 rounded-lg border border-lol-gold-dark">
            <strong className="text-xl font-display font-bold text-lol-gold block mb-2">Consejos de Juego:</strong>
            <ul className="list-disc list-inside space-y-2 text-lol-gold-light/80">
              {recommendation.strategicAdvice.map((advice, index) => <li key={index}>{advice.content}</li>)}
            </ul>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <button
            onClick={() => setStatus('idle')}
            className="w-full bg-lol-gold hover:bg-lol-gold-dark text-lol-blue-dark font-display font-bold py-3 px-4 rounded-lg transition-colors duration-300"
          >
            Analizar otro Perfil
          </button>
          
          <div className="flex space-x-2">
            <button
              onClick={handleGetPostMatchAnalysis}
              className="w-1/2 bg-lol-blue-accent hover:bg-lol-gold-dark text-lol-blue-dark font-display font-bold py-2 px-4 rounded-lg transition-colors duration-300"
            >
              Análisis Post-Partida
            </button>
            <button
              onClick={handleGetCustomBuild}
              className="w-1/2 bg-lol-blue-accent hover:bg-lol-gold-dark text-lol-blue-dark font-display font-bold py-2 px-4 rounded-lg transition-colors duration-300"
            >
              Build Personalizada
            </button>
          </div>
          <button
            onClick={handleGenerateClip}
            disabled={clipStatus === 'loading'}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300"
          >
            {clipStatus === 'loading' ? 'Generando Clip...' : 'Generar Clip de tu Highlight'}
          </button>
        </div>

        {postMatchAnalysis && (
          <div className="mt-8 bg-lol-blue-dark p-4 rounded-lg border border-lol-gold-dark">
            <h3 className="text-xl font-display font-bold text-lol-gold mb-2">Reporte Post-Partida</h3>
            <p className="text-sm"><strong className="font-semibold text-lol-gold-light">KDA:</strong> {postMatchAnalysis.performance.kda}</p>
            <p className="text-sm"><strong className="font-semibold text-lol-gold-light">Puntuación:</strong> {postMatchAnalysis.performance.score}</p>
            <p className="text-sm mt-2"><strong className="font-semibold text-lol-gold-light">Fortalezas:</strong></p>
            <ul className="list-disc list-inside mt-1 space-y-1 text-lol-gold-light/80 text-sm">
              {postMatchAnalysis.strengths.map((strength, index) => <li key={index}>{strength}</li>)}
            </ul>
            <p className="text-sm mt-2"><strong className="font-semibold text-lol-gold-light">Mejoras:</strong></p>
            <ul className="list-disc list-inside mt-1 space-y-1 text-lol-gold-light/80 text-sm">
              {postMatchAnalysis.areasForImprovement.map((area, index) => <li key={index}>{area}</li>)}
            </ul>
          </div>
        )}
        
        {customBuild && (
          <div className="mt-8 bg-lol-blue-dark p-4 rounded-lg border border-lol-gold-dark">
            <h3 className="text-xl font-display font-bold text-lol-gold mb-2">Build Recomendada</h3>
            <p className="text-sm mt-2"><strong className="font-semibold text-lol-gold-light">Items:</strong></p>
            <ul className="list-disc list-inside mt-1 space-y-1 text-lol-gold-light/80 text-sm">
              {customBuild.items.map((item, index) => <li key={index}>{item.name}: {item.reason}</li>)}
            </ul>
            <p className="text-sm mt-2"><strong className="font-semibold text-lol-gold-light">Runas:</strong></p>
            <ul className="list-disc list-inside mt-1 space-y-1 text-lol-gold-light/80 text-sm">
              {customBuild.runes.map((rune, index) => <li key={index}>{rune.name}: {rune.reason}</li>)}
            </ul>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="bg-lol-blue-medium text-lol-gold-light p-8 rounded-xl shadow-lg w-full border-2 border-lol-gold-dark">
      <h2 className="text-2xl font-display font-bold text-lol-blue-accent mb-1">LoL MetaMind</h2>
      <p className="text-lol-gold-light/90 mb-6">Ingresa tus datos para recibir una recomendación personalizada.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="summonerName" className="block text-sm font-body font-medium text-lol-gold-light mb-2">Summoner Name</label>
          <input
            id="summonerName"
            type="text"
            {...register("summonerName", { required: "El nombre de invocador es requerido." })}
            className="w-full bg-lol-blue-dark border-2 border-lol-gold-dark rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-lol-blue-accent focus:border-lol-blue-accent"
            placeholder="Ej: Faker"
          />
          {errors.summonerName && <p className="text-red-500 text-xs mt-1">{errors.summonerName.message}</p>}
        </div>
        <div>
          <label htmlFor="region" className="block text-sm font-body font-medium text-lol-gold-light mb-2">Región</label>
          <select
            id="region"
            {...register("region", { required: "Debes seleccionar una región." })}
            className="w-full bg-lol-blue-dark border-2 border-lol-gold-dark rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-lol-blue-accent focus:border-lol-blue-accent"
          >
            <option value="">-- Selecciona tu región --</option>
            {regions.map(region => <option key={region} value={region}>{region}</option>)}
          </select>
          {errors.region && <p className="text-red-500 text-xs mt-1">{errors.region.message}</p>}
        </div>
        <div>
          <label htmlFor="zodiacSign" className="block text-sm font-body font-medium text-lol-gold-light mb-2">Signo Zodiacal</label>
          <select
            id="zodiacSign"
            {...register("zodiacSign", { required: "Tu signo zodiacal es necesario." })}
            className="w-full bg-lol-blue-dark border-2 border-lol-gold-dark rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-lol-blue-accent focus:border-lol-blue-accent"
          >
            <option value="">-- Selecciona tu signo --</option>
            {zodiacSigns.map(sign => <option key={sign} value={sign}>{sign}</option>)}
          </select>
          {errors.zodiacSign && <p className="text-red-500 text-xs mt-1">{errors.zodiacSign.message}</p>}
        </div>
        <button
          type="submit"
          className="w-full bg-lol-gold hover:bg-lol-gold-dark text-lol-blue-dark font-display font-bold py-3 px-4 rounded-lg transition-colors duration-300 shadow-lg shadow-lol-blue-accent/20"
        >
          Obtener Recomendación
        </button>
      </form>
    </div>
  );
}
