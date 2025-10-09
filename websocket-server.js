// src/hooks/useWebSocketCoach.js (ÚLTIMA VERSIÓN, CON DEPENDENCIA CORREGIDA)
// ============================================================
// ARQUITECTURA: Implementa Cola de Mensajes y FIX de Dependencia de Token
// ESTADO ANTERIOR: El useEffect no se disparaba al llegar el token
// ESTADO ACTUAL: El useEffect usa `userData` como dependencia para garantizar el disparo.
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTTS } from './useTTS';

// ============================================================
// CONFIGURACIÓN CENTRALIZADA
// ============================================================

const getWsUrl = () => {
  const RENDER_WS_URL = 'wss://lolmetamind-ws.onrender.com';
  if (process.env.NODE_ENV === 'production' || !process.env.NEXT_PUBLIC_WS_URL) {
    console.log(`[WS:CLIENT] 🚀 Entorno de producción detectado. Usando WS de Render: ${RENDER_WS_URL}`);
    return RENDER_WS_URL;
  }
  console.log(`[WS:CLIENT] 💻 Entorno de desarrollo. Usando WS local (de .env.local): ${process.env.NEXT_PUBLIC_WS_URL}`);
  return process.env.NEXT_PUBLIC_WS_URL;
};

const WS_URL = getWsUrl();
const HEARTBEAT_INTERVAL = 25000;

// ============================================================
// HOOK PRINCIPAL: useWebSocketCoach
// ============================================================
export function useWebSocketCoach({ userData, targetEvent, fallbackTTS = true }) {
  
  // --- ESTADO Y REFS ---
  const [aiAdvice, setAiAdvice] = useState(null);
  const [wsStatus, setWsStatus] = useState('WAITING_FOR_USER');

  const wsRef = useRef(null); 
  const reconnectTimeoutRef = useRef(null);
  const heartbeatRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const messageQueueRef = useRef([]); // Cola para mensajes no enviados

  const { speak } = useTTS();

  // ------------------------------------------------------------
  // FUNCIÓN DE VACIADO DE COLA
  // ------------------------------------------------------------
  const drainMessageQueue = useCallback(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log(`[WS:CLIENT] 💧 Vaciando cola de mensajes: ${messageQueueRef.current.length} elementos.`);
      while (messageQueueRef.current.length > 0) {
        const message = messageQueueRef.current.shift();
        ws.send(JSON.stringify(message));
        console.log(`[WS:CLIENT] ⬆️ Enviado mensaje en cola: ${message.eventType}`);
      }
    }
  }, []);

  // ------------------------------------------------------------
  // FUNCIÓN DE CONEXIÓN
  // ------------------------------------------------------------
  const connectWebSocket = useCallback(() => {
    // [GUARDIA 1] NECESARIO: Detiene intentos si no hay token (evita bucle de fallo en el server)
    if (!userData || !userData.token) {
      console.log('[WS:CLIENT] 🟡 Pausado. Esperando datos de usuario para conectar.');
      setWsStatus('WAITING_FOR_USER');
      return;
    }

    const ws = wsRef.current;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      console.log(`[WS:CLIENT] ✅ Conexión ya está en estado. No se requiere acción.`);
      if (ws.readyState === WebSocket.OPEN) {
          drainMessageQueue();
      }
      return;
    }

    clearTimeout(reconnectTimeoutRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);

    console.log(`[WS:CLIENT] 🔌 Intentando conectar a ${WS_URL}... (Intento #${reconnectAttemptsRef.current + 1})`);
    setWsStatus('CONNECTING');

    const newWs = new WebSocket(WS_URL);
    wsRef.current = newWs;

    // ------------------ MANEJADORES DE EVENTOS DEL WEBSOCKET ------------------
    
    newWs.onopen = () => {
      console.log('[WS:CLIENT] ✅ ¡Conexión establecida con el servidor!');
      setWsStatus('CONNECTED');
      reconnectAttemptsRef.current = 0;

      const authPayload = { eventType: 'USER_AUTH', token: userData.token, userId: userData.id };
      newWs.send(JSON.stringify(authPayload));
      console.log('[WS:CLIENT] 🔐 Token de autenticación enviado al servidor.');
      drainMessageQueue(); // VACIADO DE COLA AQUÍ

      // Iniciar Heartbeat
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = setInterval(() => {
        if (newWs.readyState === WebSocket.OPEN) {
          console.log('[WS:CLIENT] ❤️ Enviando Heartbeat (ping)...');
          newWs.send(JSON.stringify({ eventType: 'PING' }));
        }
      }, HEARTBEAT_INTERVAL);
    };

    newWs.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const { eventType, data } = message;

        if (eventType === 'PONG') {
          console.log('[WS:CLIENT] ❤️ Pong recibido del servidor. La conexión está viva.');
          return;
        }

        console.log('[WS:CLIENT] 🧠 Mensaje recibido del servidor:', message);

        if (eventType === targetEvent) {
          console.log(`[WS:CLIENT] 🎯 ¡Evento esperado ('${targetEvent}') recibido! Actualizando estado.`);
          setAiAdvice(data);
          if (fallbackTTS && data?.fullText) {
            console.log('[WS:CLIENT] 🔊 Reproduciendo consejo con TTS...');
            speak(data.fullText);
          }
        } else if (eventType === 'ERROR') {
          console.error('[WS:CLIENT] 🚨 Error explícito desde el servidor:', data?.message);
        } else {
          console.log(`[WS:CLIENT] ⚙️ Evento ('${eventType}') recibido pero no es el esperado ('${targetEvent}'). Se ignora.`);
        }
      } catch (err) {
        console.error('[WS:CLIENT] ❌ Error fatal al parsear mensaje del servidor:', err, 'Data recibida:', event.data);
      }
    };

    newWs.onclose = (ev) => {
      console.warn(`[WS:CLIENT] ⚠️ Conexión cerrada. Código=${ev.code}, Razón=${ev.reason}`);
      
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      
      if (ev.code !== 1000) {
        setWsStatus('RECONNECTING');
        reconnectAttemptsRef.current += 1;
        const delay = Math.min(30000, 1000 * 2 ** reconnectAttemptsRef.current);
        console.log(`[WS:CLIENT] ⏱️ Programando reconexión en ${delay / 1000} segundos...`);
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
      } else {
        setWsStatus('DISCONNECTED');
      }
    };

    newWs.onerror = (err) => {
      console.error('[WS:CLIENT] ❌ Error crítico en la conexión WebSocket. El `onclose` se disparará a continuación.', err);
      setWsStatus('ERROR');
    };
  }, [userData, targetEvent, fallbackTTS, speak, drainMessageQueue]);


  // ============================================================
  // EFECTO DE MONTAJE Y CONEXIÓN (FIX FINAL ESTRUCTURAL)
  // ============================================================
  useEffect(() => {
    // Limpieza de timers/intervalos.
    clearTimeout(reconnectTimeoutRef.current); 
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);

    // [CORRECCIÓN CRÍTICA] Si el token está disponible, iniciar conexión.
    if (userData?.token) {
        console.log('[WS:CLIENT] 🔑 Token disponible. Iniciando o reanudando conexión...');
        connectWebSocket();
    } else {
        console.log('[WS:CLIENT] 🟡 Montado. Aún esperando token de usuario...');
        setWsStatus('WAITING_FOR_USER');
    }

    // --- FUNCIÓN DE LIMPIEZA ---
    return () => {
      console.log('[WS:CLIENT] 🧹 Realizando limpieza completa del hook...');
      
      clearTimeout(reconnectTimeoutRef.current); 
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.close(1000, 'Componente desmontado'); 
          console.log('[WS:CLIENT] 🔌 Conexión cerrada voluntariamente.');
      }
      wsRef.current = null;
    };
    // CRÍTICO: Usar el objeto completo `userData` para asegurar que React dispare el efecto
    // cuando el token se carga (incluso si es en un render posterior al inicial).
  }, [userData, connectWebSocket]); 


  // ============================================================
  // FUNCIONES DE ENVÍO DE DATOS AL SERVIDOR (CON COLA)
  // ============================================================
  
  const sendMessage = useCallback((eventType, data = {}) => {
      const ws = wsRef.current;
      const message = { eventType, data, userData };

      if (ws && ws.readyState === WebSocket.OPEN) {
        // Opción 1: Enviar inmediatamente si está abierto
        ws.send(JSON.stringify(message));
        console.log(`[WS:CLIENT] 📤 Enviando evento '${eventType}' directamente.`);
        return true;
      }
      
      // Opción 2: Poner en cola si no está abierto (soluciona la carrera de tiempo)
      messageQueueRef.current.push(message);
      console.warn(`[WS:CLIENT] 📥 Mensaje '${eventType}' puesto en cola. Estado WS: ${ws?.readyState || 'undefined'}`);
      
      // FIX AGRESIVO: Si hay un mensaje en cola y la conexión no está activa, forzar un intento
      if (userData?.token && (!ws || (ws.readyState !== WebSocket.CONNECTING && ws.readyState !== WebSocket.OPEN))) {
          console.log('[WS:CLIENT] ⚠️ Forzando conexión inmediata para drenar cola (Token disponible).');
          connectWebSocket();
      }
      
      return false;
    }, [userData, connectWebSocket]
  );

  // --- Wrappers específicos ---
  const sendQueueUpdate = useCallback(() => sendMessage('QUEUE_UPDATE'), [sendMessage]);
  const sendChampSelectUpdate = useCallback((draftData) => sendMessage('CHAMP_SELECT_UPDATE', draftData), [sendMessage]);
  const sendInGameUpdate = useCallback((liveGameData) => sendMessage('LIVE_COACHING_UPDATE', { liveGameData }), [sendMessage]);

  // ============================================================
  // VALORES RETORNADOS POR EL HOOK
  // ============================================================
  return {
    aiAdvice,
    wsStatus,
    sendQueueUpdate,
    sendChampSelectUpdate,
    sendInGameUpdate
  };
}