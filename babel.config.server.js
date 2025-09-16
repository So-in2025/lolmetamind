// babel.config.server.js
// Esta configuración SÓLO se usa para el script 'build:server'.
// Next.js (Vercel) ignorará este archivo por completo.
module.exports = {
  "presets": [
    [
      "@babel/preset-env",
      {
        "targets": {
          "node": "current"
        }
      }
    ]
  ]
};
