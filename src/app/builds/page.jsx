'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const BuildsPage = () => {
  const [builds, setBuilds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBuilds = async () => {
      try {
        const response = await fetch('/api/builds', { 
          method: 'POST',
          body: JSON.stringify({ matchData: {} }), 
          headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
          throw new Error('No se pudo cargar la lista de builds.');
        }
        const result = await response.json();
        setBuilds(result);
      } catch (err) {
        console.error('Error al obtener builds:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchBuilds();
  }, []);
  
  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-lol-blue-dark text-lol-gold-light font-body flex justify-center items-center">
        <div className="text-center animate-pulse">Cargando builds...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-8 bg-lol-blue-dark text-red-400 font-body flex justify-center items-center">
        <div className="text-center">Error: {error}</div>
      </div>
    );
  }
  
  const sampleBuilds = [builds, builds, builds]; // Usar los datos simulados tres veces para poblar la página

  return (
    <div className="min-h-screen p-8 bg-lol-blue-dark text-lol-gold-light font-body">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Link href="/" className="text-lol-blue-accent hover:text-lol-gold transition-colors duration-300">
            « Volver a Inicio
          </Link>
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-bold text-lol-blue-accent text-center mb-8">
          Builds Recomendadas
        </h1>
        <div className="space-y-8">
          {sampleBuilds.map((build, index) => (
            <div key={index} className="bg-lol-blue-medium p-8 rounded-xl shadow-lg border-2 border-lol-gold-dark">
              <h2 className="text-2xl font-display font-bold text-lol-gold mb-4">
                Build de prueba #{index + 1}
              </h2>
              <p className="text-lol-gold-light/90 mb-6">
                Una build de ejemplo generada por el prototipo para fines de demostración.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-display font-bold text-lol-blue-accent mb-2">Items</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {build.items.map((item, i) => <li key={i}>{item.name} - {item.reason}</li>)}
                  </ul>
                </div>
                <div>
                  <h3 className="font-display font-bold text-lol-blue-accent mb-2">Runas</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {build.runes.map((rune, i) => <li key={i}>{rune.name} - {rune.reason}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BuildsPage;
