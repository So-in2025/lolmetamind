#!/bin/bash

# ==============================================================================
# SCRIPT DE MEJORA Y CORRECCIÓN DEL OVERLAY
#
# Objetivo: 1. Solucionar el error 'TypeError' al conectar con el WebSocket.
#           2. Rediseñar el overlay con un estilo más profesional y animaciones
#              de "texto flotante" para una mejor experiencia visual.
# ==============================================================================

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Reparando y mejorando el OBS Overlay...${NC}"

# --- Reescribir el componente del Overlay con la lógica corregida y el nuevo estilo ---
echo -e "\n${GREEN}Paso 1: Actualizando 'src/components/widgets/OBSOverlay.jsx'...${NC}"
cat << 'EOF' > src/components/widgets/OBSOverlay.jsx
'use client';
import React, { useState, useEffect, useRef } from 'react';

// Estilos en línea para el componente, más fáciles de manejar con Tailwind
const styles = {
  container: "bg-lol-blue-dark/80 text-lol-gold-light p-4 rounded-lg shadow-lg w-full max-w-md mx-auto border-2 border-lol-gold-dark backdrop-blur-sm",
  title: "text-lg font-display font-bold text-lol-blue-accent mb-3 text-center",
  infoGrid: "grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4",
  infoItem: "bg-lol-blue-medium/50 p-2 rounded-md",
  infoLabel: "font-semibold text-lol-gold",
  tipContainer: "bg-purple-900/60 p-3 rounded-lg border border-purple-500 min-h-[80px] flex items-center justify-center text-center transition-all duration-300",
  tipText: "text-base font-bold text-yellow-300 transition-opacity duration-500",
};

export default function OBSOverlay() {
  const [error, setError] = useState(null);
  const [wsMessage, setWsMessage] = useState("Esperando consejos del coach...");
  const [isVisible, setIsVisible] = useState(true);
  const ws = useRef(null);
  const messageTimeout = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL;

    // *** CORRECCIÓN DEL BUG ***
    // Verificamos que las variables necesarias existan antes de continuar.
    if (!token) {
      setError('No estás autenticado. Por favor, inicia sesión en la app principal primero.');
      return;
    }
    if (!wsUrl) {
      setError('La URL del servidor de WebSocket no está configurada. El administrador debe revisar las variables de entorno.');
      return;
    }

    function connect() {
      // Evita múltiples conexiones
      if (ws.current && ws.current.readyState === WebSocket.OPEN) return;

      console.log('Intento de conexión WebSocket a:', wsUrl);
      const socket = new WebSocket(`${wsUrl}?token=${token}`);

      socket.onopen = () => {
        console.log('🔗 Conectado al servidor WebSocket para el coach.');
        setError(null);
      };

      socket.onmessage = (event) => {
        console.log('✉️ Mensaje del servidor:', event.data);
        
        // *** LÓGICA DE TEXTO FLOTANTE ***
        setIsVisible(false); // Oculta el texto anterior

        setTimeout(() => {
          setWsMessage(event.data);
          setIsVisible(true); // Muestra el nuevo texto con una transición
        }, 500); // Pequeño delay para la animación de salida

        // Oculta el mensaje después de un tiempo para que no sature la pantalla
        if (messageTimeout.current) clearTimeout(messageTimeout.current);
        messageTimeout.current = setTimeout(() => {
          setIsVisible(false);
        }, 15000); // El consejo permanece visible por 15 segundos
      };

      socket.onclose = () => {
        console.log('💔 Desconectado. Reintentando en 5 segundos...');
        setTimeout(connect, 5000); // Intenta reconectar si se pierde la conexión
      };

      socket.onerror = (err) => {
        console.error('❌ Error en WebSocket:', err);
        setError("No se pudo conectar al servidor de coaching. Reintentando...");
        socket.close(); // Cierra la conexión fallida para forzar la reconexión
      };
      
      ws.current = socket;
    }

    connect();

    // Limpieza al desmontar el componente
    return () => {
      if (messageTimeout.current) clearTimeout(messageTimeout.current);
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  if (error) {
    return <div className={styles.container}><p className="text-red-500 text-center">{error}</p></div>;
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>MetaMind Coach</h3>
      <div className={styles.tipContainer}>
        <p className={`${styles.tipText} ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          {wsMessage}
        </p>
      </div>
    </div>
  );
};
EOF
echo "Actualizado: src/components/widgets/OBSOverlay.jsx. ✅"


echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡OVERLAY CORREGIDO Y MEJORADO! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Pasos Finales y Cruciales:${NC}"
echo -e "1.  **Variable de Entorno:** Ve a la configuración de tu proyecto en **Vercel** y asegúrate de tener una variable de entorno llamada \`NEXT_PUBLIC_WEBSOCKET_URL\` con el valor de la URL de tu servidor en Render (ej: \`wss://tu-servidor.onrender.com\`). **Este paso es obligatorio.**"
echo -e "2.  **Sube los cambios** a tu repositorio. Vercel se redesplegará con la nueva versión del overlay."
echo -e "3.  Una vez desplegado, abre el overlay. El error habrá desaparecido y verás el nuevo diseño con consejos que aparecen y desaparecen con una animación suave."