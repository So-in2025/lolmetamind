const WebSocket = require('ws');

const port = process.env.PORT || 8080;

const wss = new WebSocket.Server({ port });

console.log(`✅ Servidor WebSocket para el Coach en Tiempo Real iniciado en el puerto ${port}.`);

const coachingTips = [
  "¡Alerta! El jungla enemigo (Lee Sin) está cerca. Juega de forma más segura.",
  "Estás ganando tu línea. Presiona al enemigo y destruye la torreta lo antes posible.",
  "El Heraldo está disponible. Ve a ayudar a tu jungla para tomar el objetivo.",
  "Necesitas agruparte con tu equipo. Las peleas en grupo son tu fortaleza.",
  "Atención al mapa. El ADC enemigo (Jinx) está solo en la línea inferior."
];

let tipIndex = 0;

wss.on('connection', ws => {
  console.log('🔗 Cliente WebSocket conectado.');
  ws.send('👋 Bienvenido al coach en tiempo real.');

  const interval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(coachingTips[tipIndex]);
      console.log(`✉️ Enviando consejo: "${coachingTips[tipIndex]}"`);
      tipIndex = (tipIndex + 1) % coachingTips.length;
    }
  }, 5000);

  ws.on('close', () => {
    console.log('💔 Cliente WebSocket desconectado.');
    clearInterval(interval);
  });
  
  ws.on('message', message => {
    console.log(`✉️ Mensaje recibido del cliente: ${message}`);
  });
});
