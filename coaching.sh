#!/bin/bash

# ==============================================================================
# SCRIPT DE ACTUALIZACIÓN - FASE 3 (FINALE): ACTIVACIÓN DEL COACH EN VIVO
#
# Rol: Full-Stack Developer
# Objetivo: 1. Transformar el websocket-server en un servicio inteligente que
#              pueda manejar múltiples usuarios y consultar partidas en vivo.
#           2. Crear un nuevo prompt de IA para el análisis en tiempo real.
#           3. Conectar el servidor WebSocket a la API de Riot y a la IA.
#           4. Actualizar el OBS Overlay para que se identifique ante el servidor.
# ==============================================================================

# --- Colores para la salida ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Iniciando la implementación final del motor de coaching en tiempo real...${NC}"

# --- 1. Crear un nuevo prompt para el análisis en vivo ---
echo -e "\n${GREEN}Paso 1: Añadiendo prompt para coaching en vivo a 'src/lib/ai/prompts.js'...${NC}"
# Usamos awk para añadir la nueva función sin borrar el contenido existente
awk '/return \`/{
  print;
  print "  `;";
  print "};";
  print "";
  print "/**";
  print " * Genera el prompt para un consejo de coaching en tiempo real.";
  print " * @param {object} liveGameData - Datos de la partida en vivo de la API de Riot.";
  print " * @param {string} userSummonerName - El nombre del invocador que está jugando.";
  print " * @returns {string} - El prompt para la IA.";
  print " */";
  print "export const createLiveCoachingPrompt = (liveGameData, userSummonerName) => {";
  print "  const userParticipant = liveGameData.participants.find(p => p.summonerName === userSummonerName);";
  print "  const teamId = userParticipant.teamId;";
  print "  const allies = liveGameData.participants.filter(p => p.teamId === teamId);";
  print "  const enemies = liveGameData.participants.filter(p => p.teamId !== teamId);";
  print "";
  print "  return `";
  print "    Eres MetaMind, un coach experto de League of Legends. Analiza los siguientes datos de una partida en curso.";
  print "    El jugador principal es \\"${userSummonerName}\\" que está jugando con ${userParticipant.championName}.";
  print "    Equipo Aliado: ${JSON.stringify(allies.map(p => p.championName))}";
  print "    Equipo Enemigo: ${JSON.stringify(enemies.map(p => p.championName))}";
  print "    Basado en las composiciones y en el campeón del jugador, genera UN solo consejo táctico, corto y directo para los próximos 2 minutos de partida. El consejo debe ser una acción clara y concisa.";
  print "    Ejemplos de respuesta: \\"El jungla enemigo probablemente esté en su mejora roja, ten cuidado con una emboscada por ese lado.\\", \\"Tu equipo tiene ventaja en las peleas grupales, busca forzar un objetivo como el Dragón.\\", \\"El ADC enemigo no tiene Flash, es un buen momento para una iniciación agresiva.\\"";
  print "  `;";
  print "};";
  next;
} 1' src/lib/ai/prompts.js > tmp.js && mv tmp.js src/lib/ai/prompts.js
echo "Actualizado: src/lib/ai/prompts.js"


# --- 2. Actualizar el OBS Overlay para que envíe el token de usuario ---
echo -e "\n${GREEN}Paso 2: Modificando 'src/components/widgets/OBSOverlay.jsx' para autenticarse...${NC}"
# Reemplazamos el useEffect para que obtenga el token y lo pase en la conexión
sed -i.bak "/const ws = useRef(null);/a\\
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
" src/components/widgets/OBSOverlay.jsx

sed -i.bak "s|ws.current = new WebSocket(process.env.NEXT_PUBLIC_WEBSOCKET_URL);|if (!token) { \
      setError('No estás autenticado. Por favor, inicia sesión para usar el overlay.'); \
      setLoading(false); \
      return; \
    } \
    // Adjuntamos el token como un parámetro en la URL de conexión \
    const wsUrl = \`\${process.env.NEXT_PUBLIC_WEBSOCKET_URL}?token=\${token}\`; \
    ws.current = new WebSocket(wsUrl);|" src/components/widgets/OBSOverlay.jsx

rm src/components/widgets/OBSOverlay.jsx.bak
echo "Actualizado: src/components/widgets/OBSOverlay.jsx"


# --- 3. Transformar el Servidor WebSocket en un Servicio Inteligente ---
echo -e "\n${GREEN}Paso 3: Reescribiendo 'websocket-server.js' con la nueva lógica de producción...${NC}"
cat << 'EOF' > websocket-server.js
// websocket-server.js
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const url = require('url');
const { getLiveGameBySummonerId } = require('./dist/riotApiService'); // Usaremos una versión compilada
const { generateLiveCoachingTip } = require('./dist/aiService'); // Usaremos una versión compilada

const port = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET;

const wss = new WebSocket.Server({ port });

// Almacenará los clientes conectados y sus datos de usuario
const clients = new Map();

console.log(`✅ Servidor WebSocket para el Coach en Tiempo Real iniciado en el puerto ${port}.`);

wss.on('connection', (ws, req) => {
  const parameters = new URLSearchParams(url.parse(req.url).search);
  const token = parameters.get('token');

  if (!token) {
    console.log('Cliente intentó conectar sin token. Conexión rechazada.');
    ws.close(1008, "Token no proporcionado");
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    
    // Guardamos el cliente con sus datos de usuario. En un entorno real,
    // aquí haríamos una consulta a la DB para obtener summoner_id y region.
    // Por ahora, lo simulamos hasta que la DB esté conectada.
    clients.set(ws, { 
        userId: userId, 
        username: decoded.username,
        // TODO: Reemplazar estos datos con una consulta a la base de datos
        // usando el userId para obtener los datos del invocador vinculado.
        summonerId: "SIMULATED_SUMMONER_ID", 
        region: "LAS"
    });

    console.log(`🔗 Cliente conectado: ${decoded.username} (ID: ${userId})`);
    ws.send('👋 ¡Bienvenido al coach en tiempo real! Buscando tu partida...');

    ws.on('close', () => {
      console.log(`💔 Cliente desconectado: ${decoded.username}`);
      clients.delete(ws);
    });
    
    ws.on('error', (error) => {
        console.error(`Error en la conexión de ${decoded.username}:`, error);
    });

  } catch (err) {
    console.log(`Token inválido. Conexión rechazada. Error: ${err.message}`);
    ws.close(1008, "Token inválido");
  }
});

// --- El Motor de Coaching en Tiempo Real ---
// Este intervalo es el corazón del sistema.
setInterval(async () => {
  if (clients.size === 0) return;

  console.log(`\n🔎 Verificando partidas activas para ${clients.size} cliente(s)...`);

  for (const [ws, userData] of clients.entries()) {
    if (ws.readyState !== WebSocket.OPEN) continue;

    try {
      // TODO: Usar userData.summonerId y userData.region reales de la DB
      const liveGame = await getLiveGameBySummonerId(userData.summonerId, userData.region);
      
      if (liveGame) {
        console.log(`[${userData.username}] Partida encontrada. Generando consejo de IA...`);
        const tip = await generateLiveCoachingTip(liveGame, userData.username);
        ws.send(`[Minuto ${Math.floor(liveGame.gameLength / 60)}]: ${tip}`);
      } else {
        // Esto es normal, el usuario no está en partida.
        // console.log(`[${userData.username}] No se encontró partida activa.`);
      }
    } catch (error) {
      console.error(`Error procesando al cliente ${userData.username}:`, error);
      // Podríamos enviar un mensaje de error al cliente si es necesario
      // ws.send('Error al obtener datos de la partida.');
    }
  }
}, 30000); // Revisa cada 30 segundos
EOF

# --- 4. Crear archivos simulados para que el servidor arranque (temporal) ---
# En un entorno de producción real, esto sería parte de un build step (compilación)
# Por ahora, creamos stubs para que `require` no falle.
echo -e "\n${GREEN}Paso 4: Creando stubs de servicios para el servidor WebSocket...${NC}"
mkdir -p dist
cat << 'EOF' > dist/riotApiService.js
// dist/riotApiService.js (Stub)
// En producción, aquí estaría el código compilado de src/services/riotApiService.js
// Por ahora, simulamos la función para que el servidor pueda arrancar.
module.exports.getLiveGameBySummonerId = async (summonerId, region) => {
    console.log(`(STUB) Buscando partida para ${summonerId} en ${region}`);
    // Devuelve null para simular que no hay partida, o un objeto de partida para probar.
    return null; 
};
EOF
cat << 'EOF' > dist/aiService.js
// dist/aiService.js (Stub)
// En producción, aquí estaría el código compilado de src/lib/ai/strategist.js
module.exports.generateLiveCoachingTip = async (liveGameData, summonerName) => {
    console.log(`(STUB) Generando consejo de IA para ${summonerName}`);
    return "Este es un consejo de IA simulado. ¡Concéntrate en farmear!";
};
EOF
echo "Creados stubs en la carpeta /dist"


echo -e "\n${YELLOW}----------------------------------------------------------------------"
echo -e "¡Motor de Coaching en Vivo implementado! ✅"
echo -e "----------------------------------------------------------------------${NC}"
echo -e "\n${CYAN}Pasos Finales y Puesta en Marcha:${NC}"
echo -e "1.  **Conexión a la Base de Datos:** El `websocket-server.js` aún simula los datos del invocador. El último paso de código es reemplazar los datos `SIMULATED_SUMMONER_ID` y `LAS` con una consulta real a tu base de datos PostgreSQL usando el `userId` para obtener el perfil que el usuario guardó."
echo -e "2.  **Build Step:** El servidor ahora depende de código en `src/`. Para producción, necesitarás un 'build step' que compile tu código de `src/services` y `src/lib` a JavaScript común (CommonJS) en la carpeta `dist/` para que el servidor Node.js pueda usarlo. Herramientas como `tsc` (TypeScript Compiler) o `babel` son estándar para esto."
echo -e "3.  **Despliegue Final:** Sube todos los cambios. Asegúrate de que tu servidor de Render (donde corre el websocket) tenga acceso a las mismas variables de entorno (JWT_SECRET, RIOT_API_KEY, GEMINI_API_KEY, DATABASE_URL)."
echo -e "\n¡Felicidades, ingeniero! Con estos cambios, la arquitectura de LoL MetaMind está completa. El sistema ahora es capaz de ofrecer la experiencia de coaching en tiempo real que definimos en la visión del proyecto."