'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function LoginButtons() {
  const router = useRouter();
  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };
  const handleTwitchLogin = () => {
    // Si bien no estamos implementando Twitch Auth en este momento,
    // se mantiene el botón para futuras fases.
    alert('Función de Twitch aún no implementada.');
  };

  return (
    <div className="flex flex-col space-y-4">
      <button
        onClick={handleGoogleLogin}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 shadow-lg"
      >
        Login con Google
      </button>
      <button
        onClick={handleTwitchLogin}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 shadow-lg"
      >
        Login con Twitch
      </button>
    </div>
  );
}
