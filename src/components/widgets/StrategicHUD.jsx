import React from 'react';

const StrategicHUD = ({ message }) => {
  return (
    <div className="bg-lol-blue-dark/50 text-lol-gold-light p-4 rounded-lg shadow-lg w-full max-w-md mx-auto border-2 border-lol-gold-dark backdrop-blur-md">
      <h3 className="text-lg font-display font-bold text-lol-gold-light mb-3 text-center -webkit-app-region-drag">Estrategia</h3>
      <p className="text-base font-body text-lol-gold-light text-center">{message}</p>
    </div>
  );
};

export default StrategicHUD;
