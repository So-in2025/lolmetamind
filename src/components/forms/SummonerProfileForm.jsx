'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

export default function SummonerProfileForm({ onProfileUpdate }) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, getValues } = useForm();
  const [apiError, setApiError] = useState('');
  const [showSimulationButton, setShowSimulationButton] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const regions = ['LAS', 'LAN', 'NA', 'EUW', 'EUNE', 'KR', 'JP'];

  const onSubmit = async (data) => {
    setApiError('');
    setShowSimulationButton(false);
    try {
      const cleanTagLine = data.tagLine.startsWith('#') ? data.tagLine.substring(1) : data.tagLine;

      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ ...data, tagLine: cleanTagLine }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'No se pudo actualizar el perfil.');
      }
      
      alert('¡Perfil de invocador vinculado con éxito!');
      if(onProfileUpdate) onProfileUpdate(result.user);

    } catch (err) {
      console.error("Error en el envío del formulario:", err);
      setApiError(err.message);
      // Si el error ocurre, mostramos el botón de simulación
      setShowSimulationButton(true);
    }
  };

  // Nueva función para manejar el modo de simulación
  const handleSimulation = async () => {
    setIsSimulating(true);
    setApiError('');
    const data = getValues(); // Obtenemos los datos actuales del formulario
    try {
        const cleanTagLine = data.tagLine.startsWith('#') ? data.tagLine.substring(1) : data.tagLine;
        const response = await fetch('/api/user/profile/simulate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ ...data, tagLine: cleanTagLine }),
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'No se pudo crear el perfil simulado.');
        }

        alert('¡Modo de simulación activado! Perfil simulado vinculado con éxito.');
        if(onProfileUpdate) onProfileUpdate(result.user);

    } catch (err) {
        console.error("Error en la simulación:", err);
        setApiError(err.message);
    } finally {
        setIsSimulating(false);
        setShowSimulationButton(false);
    }
  };

  return (
    <div className="bg-lol-blue-medium text-lol-gold-light p-8 rounded-xl shadow-lg w-full border-2 border-lol-gold-dark">
      <h2 className="text-2xl font-display font-bold text-lol-blue-accent mb-2">Vincula tu Riot ID</h2>
      <p className="text-lol-gold-light/90 mb-6">
        Ingresa tu nombre de juego y tu tagline para activar el coaching. Lo encontrarás pasando el mouse sobre tu avatar en el cliente de Riot.
      </p>
      {apiError && <p className="bg-red-900/50 text-red-300 border border-red-500 rounded-md p-3 text-center mb-4">{apiError}</p>}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow">
            <label htmlFor="gameName" className="block text-sm font-medium mb-2">Nombre de Juego</label>
            <input
              id="gameName"
              placeholder="Ej: Faker"
              {...register("gameName", { required: "El nombre es requerido." })}
              className="w-full bg-lol-blue-dark border-2 border-lol-gold-dark rounded-lg px-4 py-2"
            />
            {errors.gameName && <p className="text-red-500 text-xs mt-1">{errors.gameName.message}</p>}
          </div>
          <div className="w-full md:w-1/3">
            <label htmlFor="tagLine" className="block text-sm font-medium mb-2">Tagline</label>
            <input
              id="tagLine"
              placeholder="KR1"
              {...register("tagLine", { required: "El tagline es requerido." })}
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
      
      {/* Botón de simulación que aparece en caso de error */}
      {showSimulationButton && (
        <div className="mt-4 text-center">
            <p className="text-sm text-lol-gold-light/70 mb-2">Aún no estamos conectados con Riot.</p>
            <button
                onClick={handleSimulation}
                disabled={isSimulating}
                className="w-full bg-lol-blue-accent hover:bg-cyan-500 text-lol-blue-dark font-display font-bold py-3 px-4 rounded-lg disabled:opacity-50"
            >
                {isSimulating ? 'Simulando...' : '¿Quieres avanzar con una simulación?'}
            </button>
        </div>
      )}
    </div>
  );
}dd