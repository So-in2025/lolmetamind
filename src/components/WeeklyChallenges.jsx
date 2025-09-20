'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

const WeeklyChallenges = () => {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;

    const fetchChallenges = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/challenges/weekly', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          throw new Error('No se pudo cargar la lista de retos.');
        }
        const result = await response.json();
        if (Array.isArray(result)) {
          setChallenges(result);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchChallenges();
  }, [token]);
  
  const handleProcessLastMatch = async () => {
    setProcessing(true);
    setError(null);
    try {
        const response = await fetch('/api/challenges/progress', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Error al procesar la partida.');
        alert('¡Progreso actualizado! Vuelve a cargar la página para ver los cambios.');
        // Para una mejor UX, se debería refrescar el estado aquí.
        // window.location.reload(); // Solución simple
    } catch (err) {
        setError(err.message);
    } finally {
        setProcessing(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return <p className="text-center animate-pulse">Generando tus desafíos personalizados con IA...</p>;
    }
    if (error) {
      return <p className="text-center text-red-400">Error: {error}</p>;
    }
    if (challenges.length === 0) {
      return <p className="text-center text-lol-gold-light/70">No tienes desafíos activos. ¡Juega una partida y sincroniza para generar nuevos!</p>;
    }
    return (
      <ul className="space-y-4">
        {challenges.map(challenge => (
          <li key={challenge.id} className="bg-lol-blue-dark p-4 rounded-lg border border-lol-gold-dark">
            <h4 className="font-display font-bold text-lol-blue-accent">{challenge.title} ({challenge.challenge_type})</h4>
            <p className="text-sm text-lol-gold-light/80 mt-1">{challenge.description}</p>
            <div className="mt-2 text-sm">
              <span className="font-semibold text-lol-gold-light">Progreso:</span> {challenge.progress} / {challenge.goal}
              {challenge.is_completed && <span className="text-green-400 ml-2">¡Completado!</span>}
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="bg-lol-blue-medium p-8 rounded-xl shadow-lg w-full border-2 border-lol-gold-dark mt-12 lg:mt-0">
      <h3 className="text-2xl font-display font-bold text-lol-gold mb-4 text-center">Tus Misiones de Coach</h3>
      <div className="min-h-[200px]">
        {renderContent()}
      </div>
      <button 
        onClick={handleProcessLastMatch}
        disabled={processing}
        className="w-full mt-4 bg-lol-blue-accent hover:bg-cyan-500 text-lol-blue-dark font-bold py-2 px-4 rounded disabled:opacity-50"
      >
        {processing ? 'Analizando partida...' : 'Sincronizar última partida'}
      </button>
    </div>
  );
};

export default WeeklyChallenges;
