// babel.config.js
// Esta configuración SÓLO se usa para el script 'build:server'.
// Next.js (Vercel) ignorará este archivo y usará su compilador SWC.
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
