'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function LoginButtons() {
  const router = useRouter();
  const handleGoogleLogin = () => {
    // Lógica para iniciar el flujo de Google OAuth (por implementar)
    alert("Iniciando sesión con Google...");
    // router.push('/api/auth/google'); // Esto es lo que se llamaría en un flujo real
  };

  return (
    <div className="flex flex-col space-y-4">
      <button
        onClick={handleGoogleLogin}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 shadow-lg"
      >
        Login con Google
      </button>
    </div>
  );
}
