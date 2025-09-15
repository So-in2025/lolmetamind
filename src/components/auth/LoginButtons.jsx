'use client';

import React from 'react';

export default function LoginButtons() {
  const handleTwitchLogin = () => {
    window.location.href = '/api/auth/twitch';
  };

  return (
    <div className="flex flex-col space-y-4">
      <button
        onClick={handleTwitchLogin}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 shadow-lg"
      >
        Login con Twitch
      </button>
    </div>
  );
}