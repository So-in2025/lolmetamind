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

// --- CORRECCIÓN FINAL Y DEFINITIVA ---
// Usamos SOLAMENTE las columnas que existen en tu base de datos.
// Basado en tu lista: id, username, email, etc.
async function fetchUserData(userId) {
  try {
    // SELECCIONAMOS 'id' y 'username'. Ambas existen.
    // YA NO PEDIMOS 'subscription_tier' NI NINGUNA OTRA COLUMNA FANTASMA.
    const query = 'SELECT id, username FROM users WHERE id = $1';
    const result = await db.query(query, [userId]);
    return result.rows[0];
  } catch (error) {
    console.error(`Error al buscar usuario ${userId} en la DB:`, error);
    return null;
  }
}
// --- FIN DE LA CORRECCIÓN ---

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
    const userData = await fetchUserData(userId);
    // Verificamos que el usuario exista y que la conexión siga abierta
    if (userData && socket.readyState === 'open') {
      // Ya no se comprueba la suscripción, se envía un consejo de prueba para confirmar que todo el circuito funciona.
      // A futuro, aquí se integra la lógica de la IA.
      socket.emit('game_event', {
        time: new Date().toLocaleTimeString(),
        message: `¡Conexión exitosa, ${userData.username}! El coach está activo.`
      });
    }
  }, 15000); // Enviar un evento cada 15 segundos

  socket.on('disconnect', () => {
    activeClients.delete(socket.id);
    clearInterval(intervalId);
    console.log(`[DESCONEXIÓN] Usuario ${userId} desconectado. Clientes activos: ${activeClients.size}`);
  });
});

console.log(`✅ Servidor WebSocket de Producción iniciado en el puerto ${PORT}.`);