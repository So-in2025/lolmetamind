'use client';
import React, { useState, useEffect, useRef } from 'react-g';

const OBSOverlay = () => {
  const [data, setData] = useState(null);
  const [builds, setBuilds] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wsMessage, setWsMessage] = useState(null);

  const ws = useRef(null);

  useEffect(() => {
    // Conexión con el servidor WebSocket
    if (!ws.current) {
      ws.current = new WebSocket(process.env.NEXT_PUBLIC_WEBSOCKET_URL);
      console.log('Intento de conexión WebSocket...');

      ws.current.onopen = () => {
        console.log('🔗 Conectado al servidor WebSocket para el coach.');
      };

      ws.current.onmessage = (event) => {
        console.log('✉️ Mensaje del servidor:', event.data);
        setWsMessage(event.data);
        // **NUEVA FUNCIONALIDAD: NARRACIÓN EN TIEMPO REAL**
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(event.data);
          window.speechSynthesis.speak(utterance);
        }
      };

      ws.current.onclose = () => {
        console.log('💔 Desconectado del servidor WebSocket.');
      };

      ws.current.onerror = (err) => {
        console.error('❌ Error en WebSocket:', err);
      };
    }

    // Lógica para obtener TODOS los datos iniciales de las APIs simuladas
    const fetchAllData = async () => {
      try {
        const [overlayRes, buildsRes, recRes] = await Promise.all([
          fetch('/api/overlay'),
          fetch('/api/builds', { method: 'POST', body: JSON.stringify({ matchData: {} }), headers: { 'Content-Type': 'application/json' } }),
          fetch('/api/recommendation', { method: 'POST', body: JSON.stringify({ playerData: {} }), headers: { 'Content-Type': 'application/json' } })
        ]);

        if (!overlayRes.ok || !buildsRes.ok || !recRes.ok) {
          throw new Error('No se pudo cargar la data del overlay o las recomendaciones.');
        }

        const overlayResult = await overlayRes.json();
        const buildsResult = await buildsRes.json();
        const recResult = await recRes.json();

        setData(overlayResult);
        setBuilds(buildsResult);
        setRecommendation(recResult);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
    const interval = setInterval(fetchAllData, 30000); // Refrescar los datos de la partida cada 30s
    
    return () => {
      clearInterval(interval);
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
    };
  }, []);

  if (loading) {
    return <div className="bg-lol-blue-dark bg-opacity-90 text-lol-gold-light p-6 rounded-xl shadow-lg w-full text-center animate-pulse max-w-sm mx-auto border-2 border-lol-gold-dark">Cargando datos...</div>;
  }
  if (error) {
    return <div className="bg-lol-blue-dark bg-opacity-90 text-red-500 p-6 rounded-xl shadow-lg w-full text-center max-w-sm mx-auto border-2 border-lol-gold-dark">Error: {error}</div>;
  }
  return (
    <div className="bg-lol-blue-dark bg-opacity-90 text-lol-gold-light p-6 rounded-xl shadow-lg w-full border-2 border-lol-gold-dark max-w-lg mx-auto">
      <h3 className="text-xl font-display font-bold text-lol-blue-accent mb-4 text-center">Panel del Coach</h3>

      <div className="bg-lol-blue-medium p-4 rounded-lg mb-4">
        <p className="text-sm mb-2"><strong className="font-semibold text-lol-gold">Jugador:</strong> {data.summonerName}</p>
        <p className="text-sm mb-2"><strong className="font-semibold text-lol-gold">Campeón:</strong> {data.champion} ({data.role})</p>
        <p className="text-sm"><strong className="font-semibold text-lol-gold">Arquetipo:</strong> <span className="text-purple-400">{recommendation.archetype}</span></p>
      </div>

      <div className="bg-purple-800 p-3 rounded-lg animate-pulse mb-4">
        <p className="text-lg font-bold text-yellow-300">¡Alerta Estratégica!</p>
        <p className="text-sm mt-1">{wsMessage || "Esperando consejos del coach..."}</p>
      </div>
      
      {builds && (
        <div className="bg-lol-blue-medium p-4 rounded-lg">
          <h4 className="text-md font-display font-bold text-lol-gold mb-2">Build Recomendada</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-lol-gold-light/80">
            {builds.items.map((item, index) => <li key={index}>{item.name}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};
export default OBSOverlay;
