'use client';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';

export default function SummonerProfileForm({ onProfileUpdate }) {
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm();
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [gameNameInput, setGameNameInput] = useState('');
  const regions = ['LAS', 'LAN', 'NA', 'EUW', 'EUNE', 'KR', 'JP'];

  // Lógica para el autocompletado con debounce
  useEffect(() => {
    if (gameNameInput.length > 2) {
      const timerId = setTimeout(async () => {
        try {
          const response = await fetch(`/api/riot/search?name=${gameNameInput}`);
          const data = await response.json();
          setSuggestions(data);
        } catch (err) {
          console.error('Error fetching suggestions:', err);
        }
      }, 500); // Debounce de 500ms
      return () => clearTimeout(timerId);
    } else {
      setSuggestions([]);
    }
  }, [gameNameInput]);

  const handleSuggestionClick = (suggestion) => {
    setValue('gameName', suggestion.gameName);
    setValue('tagLine', suggestion.tagLine);
    setGameNameInput(suggestion.gameName);
    setSuggestions([]);
  };

  const onSubmit = async (data) => {
    setError('');
    try {
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'No se pudo actualizar el perfil.');
      }
      
      alert('¡Perfil de invocador vinculado con éxito!');
      if(onProfileUpdate) onProfileUpdate(result.user);

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-lol-blue-medium text-lol-gold-light p-8 rounded-xl shadow-lg w-full border-2 border-lol-gold-dark">
      <h2 className="text-2xl font-display font-bold text-lol-blue-accent mb-2">Vincula tu Riot ID</h2>
      <p className="text-lol-gold-light/90 mb-6">
        Ingresa tu nombre de juego y tu tagline para activar el coaching.
      </p>
      {error && <p className="bg-red-900/50 text-red-300 border border-red-500 rounded-md p-3 text-center mb-4">{error}</p>}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 relative">
          <div className="flex-grow">
            <label htmlFor="gameName" className="block text-sm font-medium mb-2">Nombre de Juego</label>
            <input
              id="gameName"
              placeholder="TuNombreDeJuego"
              {...register("gameName", { required: "El nombre es requerido." })}
              onChange={(e) => setGameNameInput(e.target.value)}
              className="w-full bg-lol-blue-dark border-2 border-lol-gold-dark rounded-lg px-4 py-2"
            />
            {errors.gameName && <p className="text-red-500 text-xs mt-1">{errors.gameName.message}</p>}
            
            {/* Lista de sugerencias de autocompletado */}
            {suggestions.length > 0 && (
              <ul className="absolute z-10 w-full bg-lol-blue-dark border border-lol-gold-dark mt-1 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((s, index) => (
                  <li 
                    key={index} 
                    onClick={() => handleSuggestionClick(s)}
                    className="p-3 hover:bg-lol-blue-medium cursor-pointer transition-colors"
                  >
                    {s.gameName}#{s.tagLine}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="w-full md:w-1/3">
            <label htmlFor="tagLine" className="block text-sm font-medium mb-2">Tagline</label>
            <input
              id="tagLine"
              placeholder="#LAS"
              {...register("tagLine", { 
                  required: "El tagline es requerido.",
                  pattern: {
                    value: /^#?[a-zA-Z0-9]+$/,
                    message: "Tagline inválido. Ej: #LAS, #1234"
                  }
              })}
              className="w-full bg-lol-blue-dark border-2 border-lol-gold-dark rounded-lg px-4 py-2"
            />
            {errors.tagLine && <p className="text-red-500 text-xs mt-1">{errors.tagLine.message}</p>}
          </div>
        </div>
        <div>
          <label htmlFor="region" className="block text-sm font-medium mb-2">Región de Juego</label>
          <select
            id="region"
            {...register("region", { required: "Debes seleccionar una región." })}
            className="w-full bg-lol-blue-dark border-2 border-lol-gold-dark rounded-lg px-4 py-2"
          >
            {regions.map(region => <option key={region} value={region}>{region}</option>)}
          </select>
          {errors.region && <p className="text-red-500 text-xs mt-1">{errors.region.message}</p>}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-lol-gold hover:bg-lol-gold-dark text-lol-blue-dark font-display font-bold py-3 px-4 rounded-lg disabled:opacity-50"
        >
          {isSubmitting ? 'Verificando y Guardando...' : 'Vincular y Guardar'}
        </button>
      </form>
    </div>
  );
}
