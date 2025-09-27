// Ruta: so-in2025/lolmetamind/lolmetamind-adffad4206b2a133fe3e3e14ba85b1b8b418f9c3/websocket-server.js

const WebSocket = require('ws');
const url = require('url');
const { Pool } = require('pg');
require('dotenv').config();
// ELIMINADO: const jwt = require('jsonwebtoken'); 

// Imports de la distribución compilada (CJS)
const prompts = require('./dist/lib/ai/prompts');
const strategist = require('./dist/lib/ai/strategist');
const db = require('./dist/lib/db/index.js'); 

const { generateStrategicAnalysis } = strategist;

const SERVER_PORT = process.env.PORT || process.env.WS_PORT || 8080; 
const POLLING_DB_INTERVAL = 10000; // Polling DB cada 10 segundos (para la demo)

const pool = db.pool;
const wss = new WebSocket.Server({ port: SERVER_PORT }); 
const clients = new Map(); // Mantenemos el Map para rastrear la última partida (lastGameId)

console.log(`✅ Servidor WebSocket de LCU iniciado en el puerto ${SERVER_PORT}.`);

wss.on('connection', (ws, req) => {
  const userId = 1; // Hardcodeado a ID 1 para el flujo simplificado/demo

  ws.userId = userId;
  clients.set(ws, { id: userId, lastGameId: null }); 
  
  console.log(`[CONEXIÓN] Cliente de Demo (ID ${userId}) conectado. Clientes activos: ${clients.size}`);
  
  // Enviar un estado inicial para que el widget sepa que la conexión es OK
  ws.send(JSON.stringify({ event: 'STATUS', phase: 'None', realtimeAdvice: 'Conexión OK. Esperando datos LCU.' }));

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[DESCONEXIÓN] Cliente ${userId} desconectado. Clientes activos: ${clients.size}`);
  });
});


setInterval(async () => {
  if (wss.clients.size === 0) return;

  const userId = 1; 
  let freshGameData = null;
  
  try {
      // 1. Pollear la DB para obtener SOLO la data LCU del usuario 1.
      const res = await pool.query(
          // CRÍTICO: COALESCE(zodiac_sign, 'Aries') para evitar fallo en la IA
          'SELECT COALESCE(zodiac_sign, \'Aries\') as zodiac_sign, live_game_data FROM users WHERE id = $1', 
          [userId]
      );
      freshGameData = res.rows[0];
  } catch (error) {
      console.error(`Error al pollear DB:`, error);
      return;
  }

  // Si no hay data LCU o el campo está vacío, volvemos a enviar STATUS.
  if (!freshGameData || !freshGameData.live_game_data || !freshGameData.live_game_data.gameflow) {
       wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ event: 'STATUS', phase: 'None', realtimeAdvice: 'Coach inactivo. Esperando datos LCU.' }));
          }
       });
       return;
  }
  
  const liveGameData = freshGameData.live_game_data;
  const mockZodiacSign = freshGameData.zodiac_sign; // Obtenemos el signo de la DB o el mock 'Aries'
  const currentPhase = liveGameData.gameflow.phase; 
  const liveClientData = liveGameData.liveData; // Contiene todos los datos de in-game (si fase es InProgress)
  let responseMessage = null;

  // 2. LÓGICA DE FASES (Mejorada)
  if (currentPhase === 'None' || currentPhase === 'Lobby') {
      responseMessage = { event: 'STATUS', phase: currentPhase, realtimeAdvice: `Fase actual: ${currentPhase}. Inicia una cola de partida.` };
  } else if (currentPhase === 'ChampionSelect' || currentPhase === 'GameStart') {
      responseMessage = { event: 'CHAMP_SELECT', phase: currentPhase, realtimeAdvice: "Fase de Selección/Bans: Analizando composición y preparando la estrategia inicial." };
  } else if (currentPhase === 'WaitingForStats') {
      responseMessage = { event: 'STATUS', phase: currentPhase, realtimeAdvice: "Partida terminada. Generando reporte post-partida..." };
  } else if (currentPhase === 'InProgress' && liveClientData.gameData) {
      
      // Manejar el inicio de partida para un log claro
      const gameId = liveClientData.gameData.gameId;
      // Obtenemos el primer cliente (asumimos un solo cliente para el ID 1)
      const firstClient = wss.clients.values().next().value; 
      const clientData = clients.get(firstClient);

      if (clientData && clientData.lastGameId !== gameId) {
          clients.set(firstClient, { ...clientData, lastGameId: gameId });
          // Mensaje inicial de bienvenida al juego
          wss.clients.forEach(client => client.send(JSON.stringify({ event: 'START_GAME', phase: currentPhase, realtimeAdvice: `¡Bienvenido! Partida detectada. La IA te acompañará.` })));
      }

      // Ejecutar la IA
      try {
          const analysisResult = await generateStrategicAnalysis({ 
              liveGameData: liveClientData, // La IA requiere la data de in-game pura
              zodiacSign: mockZodiacSign 
          });
          
          responseMessage = {
              event: analysisResult.priorityAction || 'ANALYSIS',
              phase: currentPhase,
              realtimeAdvice: analysisResult.realtimeAdvice || analysisResult.message, 
          };
          
      } catch (error) {
          console.error(`Error al generar consejo ÉLITE:`, error);
          responseMessage = { event: 'ERROR', phase: currentPhase, realtimeAdvice: "ERROR CRÍTICO: El análisis de IA falló." };
      }
  }

  // 3. BROADCAST A TODOS LOS CLIENTES
  if (responseMessage) {
      wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(responseMessage));
          }
      });
  }
}, POLLING_DB_INTERVAL);