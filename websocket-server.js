require('dotenv').config();
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('./src/lib/db').default;

const PORT = process.env.PORT || 10000;

const io = new Server(PORT, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let activeClients = new Map();

// Función para buscar datos del usuario en la DB (SIN ZODIACO)
async function fetchUserData(userId) {
  try {
    // --- CORRECCIÓN: Eliminada la columna "zodiac_sign" ---
    const query = 'SELECT id, name, subscription_tier FROM users WHERE id = $1';
    const result = await db.query(query, [userId]);
    return result.rows[0];
  } catch (error) {
    console.error(`Error al buscar usuario ${userId} en la DB:`, error);
    return null;
  }
}

// Middleware de autenticación (sin cambios)
io.use((socket, next) => {
  const token = socket.handshake.query.token;
  if (!token) {
    return next(new Error('[ERROR] Conexión rechazada: Token JWT no proporcionado.'));
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error('[ERROR] Conexión rechazada: Token JWT inválido.'));
    }
    socket.decoded = decoded;
    next();
  });
});

io.on('connection', (socket) => {
  const userId = socket.decoded.userId;
  console.log(`[CONEXIÓN] Usuario ${userId} conectado. Clientes activos: ${activeClients.size + 1}`);
  activeClients.set(socket.id, userId);

  // Intervalo para enviar eventos
  const intervalId = setInterval(async () => {
    const userData = await fetchUserData(userId);
    if (userData) {
      socket.emit('game_event', {
        time: new Date().toLocaleTimeString(),
        message: `Consejo para ${userData.name || userId}: ¡Concéntrate en farmear!`,
        tier: userData.subscription_tier
      });
    }
  }, 15000);

  socket.on('disconnect', () => {
    activeClients.delete(socket.id);
    clearInterval(intervalId);
    console.log(`[DESCONEXIÓN] Usuario ${userId} desconectado. Clientes activos: ${activeClients.size}`);
  });
});

console.log(`✅ Servidor WebSocket de Producción iniciado en el puerto ${PORT}.`);