'use client';

import React from 'react';

export default function LoginButtons() {
  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
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
