require('dotenv').config();
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('./src/lib/db').default;

const PORT = process.env.PORT || 10000;

const io = new Server(PORT, {
  cors: {
    origin: "*", // En producción, deberías restringir esto a tu dominio
  }
});

let activeClients = new Map();

async function fetchUserData(userId) {
  try {
    const query = 'SELECT id, username FROM users WHERE id = $1';
    const result = await db.query(query, [userId]);
    return result.rows[0];
  } catch (error) {
    console.error(`Error al buscar usuario ${userId} en la DB:`, error);
    return null;
  }
}

io.use((socket, next) => {
  const token = socket.handshake.query.token;
  if (!token) {
    return next(new Error('Token no proporcionado'));
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error('Token inválido'));
    }
    socket.decoded = decoded;
    next();
  });
});

io.on('connection', (socket) => {
  const userId = socket.decoded.userId;
  console.log(`[CONEXIÓN ESTABLE] Usuario ${userId} conectado. Clientes activos: ${activeClients.size + 1}`);
  activeClients.set(socket.id, userId);

  const intervalId = setInterval(async () => {
    // Verificamos que la conexión siga abierta
    if (socket.readyState !== 'open' && !socket.connected) {
        clearInterval(intervalId);
        return;
    }

    let userData;

    // --- CORRECCIÓN FINAL Y DEFINITIVA ---
    // Si el usuario es 'master-user', no lo buscamos en la base de datos.
    // Creamos un objeto de usuario falso para que el resto del código funcione.
    if (userId === 'master-user') {
        userData = { id: 'master-user', username: 'Jh0wner' };
    } else {
        // Si es un usuario normal, lo buscamos en la base de datos.
        userData = await fetchUserData(userId);
    }
    // --- FIN DE LA CORRECCIÓN ---

    if (userData) {
      // Ahora la lógica de los consejos funcionará para ambos casos
      socket.emit('game_event', {
        time: new Date().toLocaleTimeString(),
        message: `¡Conexión exitosa, ${userData.username}! El coach está activo y listo.`
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