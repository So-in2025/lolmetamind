import { Paddle } from '@paddle/paddle-node-sdk';

// Inicializa el SDK de Paddle con tu clave de API
// El SDK leerá la variable de entorno PADDLE_API_KEY automáticamente.
export const paddle = new Paddle();
