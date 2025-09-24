import React from 'react';

const BuildsHUD = ({ build }) => {
  if (!build || !build.items || !build.runes) return null;

  return (
    <div className="bg-lol-blue-dark/50 text-lol-gold-light p-4 rounded-lg shadow-lg w-full max-w-md mx-auto border-2 border-lol-gold-dark backdrop-blur-md">
      <h3 className="text-lg font-display font-bold text-lol-gold-light mb-3 text-center -webkit-app-region-drag">Build Recomendada</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-display font-bold text-lol-blue-accent mb-2">Ítems</h4>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {build.items.map((item, index) => <li key={index}>{item}</li>)}
          </ul>
        </div>
        <div>
          <h4 className="font-display font-bold text-lol-blue-accent mb-2">Runas</h4>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {build.runes.map((rune, index) => <li key={index}>{rune}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BuildsHUD;
