'use client';
import React, { useState, useEffect, useRef } from 'react';

const OBSOverlay = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wsMessage, setWsMessage] = useState(null);

  const ws = useRef(null);

  useEffect(() => {
    // Evitar reconexiones múltiples en desarrollo
    if (!ws.current) {
      ws.current = new WebSocket(process.env.NEXT_PUBLIC_WEBSOCKET_URL);
      console.log('Intento de conexión WebSocket...');

      ws.current.onopen = () => {
        console.log('🔗 Conectado al servidor WebSocket para el coach.');
      };

      ws.current.onmessage = (event) => {
        console.log('✉️ Mensaje del servidor:', event.data);
        setWsMessage(event.data);
      };

      ws.current.onclose = () => {
        console.log('💔 Desconectado del servidor WebSocket.');
      };

      ws.current.onerror = (err) => {
        console.error('❌ Error en WebSocket:', err);
      };
    }

    // Lógica para obtener datos iniciales de la API
    const fetchOverlayData = async () => {
      try {
        const response = await fetch('/api/overlay');
        if (!response.ok) {
          throw new Error('No se pudo cargar la data del overlay.');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOverlayData();
    const interval = setInterval(fetchOverlayData, 10000);
    
    return () => {
      clearInterval(interval);
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
    };
  }, []);

  if (loading) {
    return <div className="bg-gray-900 bg-opacity-70 text-white p-4 rounded-lg shadow-lg max-w-sm mx-auto">Cargando datos...</div>;
  }
  if (error) {
    return <div className="bg-gray-900 bg-opacity-70 text-red-500 p-4 rounded-lg shadow-lg max-w-sm mx-auto">Error: {error}</div>;
  }
  return (
    <div className="bg-gray-900 bg-opacity-70 text-white p-4 rounded-lg shadow-lg max-w-sm mx-auto">
      <h3 className="text-xl font-bold text-cyan-400 mb-2">Consejos en Partida</h3>
      <p className="text-sm mb-2"><strong className="font-semibold">Jugador:</strong> {data.summonerName}</p>
      <p className="text-sm mb-2"><strong className="font-semibold">Campeón:</strong> {data.champion} ({data.role})</p>
      
      <div className="bg-purple-800 p-3 rounded-lg mt-4 animate-pulse">
        <p className="text-lg font-bold text-yellow-300">¡Alerta Estratégica!</p>
        <p className="text-sm mt-1">{wsMessage || "Esperando consejos del coach..."}</p>
      </div>

      <ul className="mt-4 space-y-2 text-sm">
        {data.tips.map(tip => (
          <li key={tip.id} className="bg-gray-800 p-2 rounded-md">
            {tip.content}
          </li>
        ))}
      </ul>
    </div>
  );
};
export default OBSOverlay;
