#!/bin/bash

echo "Corrigiendo errores de autenticación (JWT/DB inconsistency) y restaurando la funcionalidad..."

# --- ARREREGLO CRÍTICO: Modificar src/app/api/user/me/route.js (Eliminar Clerk) ---
echo "1. Corrigiendo src/app/api/user/me/route.js para usar JWT y DB default import..."
cat > src/app/api/user/me/route.js << 'EOL'
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import db from '@/lib/db'; // Importación correcta (exportación por defecto)

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(req) {
    try {
        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.userId;

        const userResult = await db.query(
            // La autenticación ahora usa el ID de la tabla users obtenido del JWT.
            'SELECT id, username, email, avatar_url, license_key, subscription_tier, trial_ends_at, riot_id_name, riot_id_tagline, region, puuid FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }
        
        return NextResponse.json(userResult.rows[0]);

    } catch (error) {
        console.error('Error al obtener los datos del usuario:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
EOL

# --- ARREGLO 2: Modificar src/app/api/activate-trial/route.js (Eliminar Clerk) ---
echo "2. Corrigiendo src/app/api/activate-trial/route.js para usar JWT y DB default import..."
cat > src/app/api/activate-trial/route.js << 'EOL'
import { NextResponse } from 'next/server';
import db from '@/lib/db'; // Importación correcta (exportación por defecto)
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req) {
    try {
        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.userId;

        const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
        const user = userResult.rows[0];

        if (!user) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }
        
        if (user.subscription_tier !== 'FREE' || user.trial_ends_at) {
            return NextResponse.json({ error: 'Este usuario no es elegible para una prueba.' }, { status: 403 });
        }

        const trialEndDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        await db.query(
            'UPDATE users SET "subscription_tier" = $1, "trial_ends_at" = $2 WHERE id = $3',
            ['TRIAL', trialEndDate, user.id]
        );

        return NextResponse.json({ message: 'Prueba de 3 días activada con éxito.' });

    } catch (error) {
        console.error('Error al activar la prueba:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
EOL

# --- ARREGLO 3: Modificar src/app/api/auth/google/route.js (Claridad y consistencia) ---
echo "3. Corrigiendo src/app/api/auth/google/route.js: Refactorizando el import de DB a 'db' para claridad."
cat > src/app/api/auth/google/route.js << 'EOL'
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import db from '@/lib/db'; // Cambiado de 'pool' a 'db' para consistencia
import { createToken } from '@/lib/auth/utils';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  
  // Novedad: Leer el parámetro 'redirect_to' de la URL
  const redirectTo = url.searchParams.get('redirect_to');

  if (!code) {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
      prompt: 'consent',
      // Novedad: Asegurar que el parámetro 'redirect_to' se mantenga
      state: redirectTo ? `redirect_to=${encodeURIComponent(redirectTo)}` : undefined,
    });
    return NextResponse.redirect(authUrl);
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2'
    });
    const userInfo = await oauth2.userinfo.get();

    let user = null;
    // Usamos db.query
    const existingUser = await db.query('SELECT * FROM users WHERE email = $1', [userInfo.data.email]);
    
    if (existingUser.rows.length > 0) {
      user = existingUser.rows[0];
    } else {
      // Usamos db.query
      const newUserResult = await db.query(
        'INSERT INTO users (username, email, google_id) VALUES ($1, $2, $3) RETURNING *',
        [userInfo.data.name, userInfo.data.email, userInfo.data.id]
      );
      user = newUserResult.rows[0];
    }

    const token = createToken(user);
    
    // Novedad: Redirigir a la URL especificada o al dashboard por defecto
    const finalRedirectPath = url.searchParams.get('state')?.includes('redirect_to=')
      ? decodeURIComponent(url.searchParams.get('state').split('redirect_to=')[1])
      : '/dashboard';

    const redirectUrl = new URL(finalRedirectPath, url.origin);
    redirectUrl.searchParams.set('token', token);
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('Error al procesar el login de Google:', error);
    // Este es el error que ve el usuario. Lo mantenemos para el fallback.
    return NextResponse.json({ error: 'Hubo un error con la autenticación de Google.' }, { status: 500 });
  }
}
EOL

# --- ARREGLO 4: Modificar src/app/api/license/verify/route.js DB import y consultas SQL ---
echo "4. Corrigiendo src/app/api/license/verify/route.js: Arreglando importación de DB y consultas SQL."
cat > src/app/api/license/verify/route.js << 'EOL'
import { NextResponse } from 'next/server';
import db from '@/lib/db'; // Importación corregida a default
import { v4 as uuidv4 } from 'uuid'; // Mantener por si se usa en el futuro

export async function POST(req) {
  try {
    const { licenseKey } = await req.json();

    if (!licenseKey) {
      return NextResponse.json({ error: 'Clave de licencia no proporcionada' }, { status: 400 });
    }

    // CORRECCIÓN DE QUERY: añadir $1 para la interpolación
    const userResult = await db.query('SELECT * FROM users WHERE "license_key" = $1', [licenseKey]);

    if (userResult.rows.length === 0) {
      return NextResponse.json({ status: 'invalid', message: 'Clave no encontrada' }, { status: 404 });
    }

    const user = userResult.rows[0];

    if (user.subscription_tier === 'PREMIUM') {
      return NextResponse.json({ status: 'active', tier: 'premium' });
    }

    if (user.subscription_tier === 'TRIAL') {
      const trialEndDate = new Date(user.trial_ends_at);
      const now = new Date();

      if (trialEndDate > now) {
        const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return NextResponse.json({ status: 'active', tier: 'trial', daysRemaining });
      } else {
        // CORRECCIÓN DE QUERY: añadir $1 y $2 para la interpolación
        await db.query('UPDATE users SET "subscription_tier" = $1 WHERE "license_key" = $2', ['FREE', licenseKey]);
        return NextResponse.json({ status: 'expired', message: 'La prueba ha expirado' });
      }
    }
    
    return NextResponse.json({ status: 'inactive', message: 'Tu cuenta no tiene una suscripción activa.' });

  } catch (error) {
    console.error('Error de verificación de licencia:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
EOL

# --- ARREGLO 5: Modificar src/app/api/hotmart-webhook/route.js DB query ---
echo "5. Corrigiendo src/app/api/hotmart-webhook/route.js: Arreglando consultas SQL."
cat > src/app/api/hotmart-webhook/route.js << 'EOL'
import { NextResponse } from 'next/server';
import db from '@/lib/db'; // Importación por defecto
import { v4 as uuidv4 } from 'uuid';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const hotmartEvent = Object.fromEntries(formData.entries());
    console.log('Webhook de Hotmart recibido:', hotmartEvent);

    const hotmartToken = req.headers.get('x-hotmart-hottok');
    if (hotmartToken !== process.env.HOTMART_WEBHOOK_SECRET) {
      console.warn('Intento de webhook no autorizado.');
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const eventType = hotmartEvent.event;
    const userEmail = hotmartEvent.email;
    const subscriptionId = hotmartEvent.sub_id || hotmartEvent.subscription; // Asumiendo 'sub_id' o 'subscription'

    if (!userEmail) {
        return NextResponse.json({ message: 'Email no proporcionado.' }, { status: 400 });
    }

    // CORRECCIÓN DE QUERY: Añadir $1
    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [userEmail]);
    let user = userResult.rows[0];

    if (eventType === 'PURCHASE_APPROVED' || eventType === 'SUBSCRIPTION_ACTIVATED') {
        if (user) {
            // CORRECCIÓN DE QUERY: Añadir $1, $2 y $3
            await db.query(
              'UPDATE users SET "subscription_tier" = $1, "hotmart_subscription_id" = $2 WHERE email = $3',
              ['PREMIUM', subscriptionId, userEmail]
            );
            console.log(`Usuario ${userEmail} actualizado a PREMIUM.`);
        }
    } else if (eventType === 'SUBSCRIPTION_CANCELED' || eventType === 'PURCHASE_REFUNDED') {
        if (user) {
            // CORRECCIÓN DE QUERY: Añadir $1 y $2
            await db.query(
              'UPDATE users SET "subscription_tier" = $1, "hotmart_subscription_id" = NULL WHERE email = $2',
              ['FREE', userEmail]
            );
            console.log(`Suscripción de ${userEmail} cancelada.`);
        }
    }

    return NextResponse.json({ message: 'Webhook procesado' }, { status: 200 });

  } catch (error) {
    console.error('Error al procesar webhook de Hotmart:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
EOL

# --- ARREGLO 6: Modificar src/app/api/challenges/weekly/route.js (Claridad y consistencia) ---
echo "6. Corrigiendo src/app/api/challenges/weekly/route.js: Refactorizando el import de DB a 'db' para claridad."
cat > src/app/api/challenges/weekly/route.js << 'EOL'
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import db from '@/lib/db'; // Cambiado de 'pool' a 'db' para consistencia
import { getMatchHistoryIds, getMatchDetails } from '@/services/riotApiService';
import { generateStrategicAnalysis } from '@/lib/ai/strategist';
import { createChallengeGenerationPrompt } from '@/lib/ai/prompts';

const JWT_SECRET = process.env.JWT_SECRET;
export const dynamic = 'force-dynamic';

async function generateAndStoreChallenges(userId, userData) {
    let recentMatchesPerformance = [];

    // --- INICIO DE LA LÓGICA DE SIMULACIÓN ---
    if (userData.puuid.startsWith('simulated-')) {
        console.log('Modo Simulación: Usando datos de historial de partidas falsos.');
        recentMatchesPerformance = [
            { win: true, kills: 10, deaths: 2, assists: 8, visionScore: 35, csPerMinute: 8.5 },
            { win: false, kills: 2, deaths: 8, assists: 5, visionScore: 15, csPerMinute: 6.0 },
            { win: true, kills: 15, deaths: 4, assists: 12, visionScore: 45, csPerMinute: 9.1 },
            { win: true, kills: 8, deaths: 1, assists: 10, visionScore: 55, csPerMinute: 7.8 },
            { win: false, kills: 4, deaths: 10, assists: 3, visionScore: 20, csPerMinute: 5.5 },
        ];
    } else {
        // Lógica original para usuarios reales
        const matchIds = await getMatchHistoryIds(userData.puuid, userData.region);
        if (matchIds.length === 0) return [];
        
        for (const matchId of matchIds) {
            const matchDetails = await getMatchDetails(matchId, userData.region);
            const participant = matchDetails.info.participants.find(p => p.puuid === userData.puuid);
            if (participant) {
                recentMatchesPerformance.push({
                    win: participant.win,
                    kills: participant.kills,
                    deaths: participant.deaths,
                    assists: participant.assists,
                    visionScore: participant.visionScore,
                    csPerMinute: (participant.totalMinionsKilled / (matchDetails.info.gameDuration / 60)).toFixed(1)
                });
            }
        }
    }
    // --- FIN DE LA LÓGICA DE SIMULACIÓN ---

    if (recentMatchesPerformance.length === 0) return [];

    const prompt = createChallengeGenerationPrompt({ summonerName: userData.riot_id_name, recentMatchesPerformance });
    const challengesFromAI = await generateStrategicAnalysis({ customPrompt: prompt });

    if (!Array.isArray(challengesFromAI)) {
        console.error("La IA no devolvió un array de desafíos. Se recibió:", challengesFromAI);
        return [];
    }
    
    // Obtenemos el Pool para la transacción
    const client = await db.pool.connect(); 
    try {
        await client.query('BEGIN');
        // Limpiar desafíos antiguos antes de insertar nuevos para evitar duplicados
        await client.query('DELETE FROM user_challenges WHERE user_id = $1', [userId]);
        for (const challenge of challengesFromAI) {
            const expires_at = new Date();
            expires_at.setDate(expires_at.getDate() + (challenge.challenge_type === 'daily' ? 1 : 7));
            await client.query(
                `INSERT INTO user_challenges (user_id, title, description, challenge_type, metric, goal, expires_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [userId, challenge.title, challenge.description, challenge.challenge_type, challenge.metric, challenge.goal, expires_at]
            );
        }
        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
    return challengesFromAI;
}

export async function GET(request) {
    try {
        const token = request.headers.get('authorization')?.split(' ')[1];
        if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.userId;

        const { rows: activeChallenges } = await db.query(
            "SELECT * FROM user_challenges WHERE user_id = $1 AND expires_at > NOW() AND is_completed = FALSE",
            [userId]
        );

        if (activeChallenges.length > 0) {
            return NextResponse.json(activeChallenges);
        }

        const userResult = await db.query('SELECT riot_id_name, region, puuid FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0 || !userResult.rows[0].puuid) {
            return NextResponse.json([]);
        }
        const newChallenges = await generateAndStoreChallenges(userId, userResult.rows[0]);
        return NextResponse.json(newChallenges);

    } catch (error) {
        console.error("Error en la API de desafíos:", error);
        return NextResponse.json({ error: 'Error interno del servidor al gestionar desafíos.' }, { status: 500 });
    }
}
EOL

# --- ARREGLO 7: Modificar src/app/api/challenges/progress/route.js (Claridad y consistencia) ---
echo "7. Corrigiendo src/app/api/challenges/progress/route.js: Refactorizando el import de DB a 'db' para claridad."
cat > src/app/api/challenges/progress/route.js << 'EOL'
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import db from '@/lib/db'; // Cambiado de 'pool' a 'db' para consistencia
import { getMatchHistoryIds, getMatchDetails } from '@/services/riotApiService';

const JWT_SECRET = process.env.JWT_SECRET;

// SOLUCIÓN: Forzar el renderizado dinámico para esta ruta
export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const token = request.headers.get('authorization')?.split(' ')[1];
        if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.userId;

        const userResult = await db.query('SELECT puuid, region FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0 || !userResult.rows[0].puuid) {
            return NextResponse.json({ error: 'Perfil de Riot no vinculado.' }, { status: 404 });
        }
        const { puuid, region } = userResult.rows[0];

        const matchIds = await getMatchHistoryIds(puuid, region);
        if (matchIds.length === 0) {
            return NextResponse.json({ message: "No se encontraron partidas recientes." });
        }
        const lastMatchId = matchIds[0];
        const matchDetails = await getMatchDetails(lastMatchId, region);
        const participant = matchDetails.info.participants.find(p => p.puuid === puuid);

        if (!participant) {
            return NextResponse.json({ error: "No se encontraron datos del jugador en la última partida." }, { status: 404 });
        }

        const { rows: activeChallenges } = await db.query(
            "SELECT * FROM user_challenges WHERE user_id = $1 AND expires_at > NOW() AND is_completed = FALSE",
            [userId]
        );

        let updates = [];
        for (const challenge of activeChallenges) {
            let progressMade = 0;
            const metric = challenge.metric;

            if (metric === 'csPerMinute') {
                progressMade = (participant.totalMinionsKilled / (matchDetails.info.gameDuration / 60));
            } else if (participant.hasOwnProperty(metric)) {
                progressMade = participant[metric];
            }

            const newProgress = Math.min(challenge.goal, challenge.progress + progressMade);
            const isCompleted = newProgress >= challenge.goal;

            await db.query(
                "UPDATE user_challenges SET progress = $1, is_completed = $2 WHERE id = $3",
                [newProgress, isCompleted, challenge.id]
            );
            updates.push({ title: challenge.title, newProgress, isCompleted });
        }

        return NextResponse.json({ message: "Progreso de desafíos actualizado.", updates });

    } catch (error) {
        console.error("Error al procesar progreso:", error);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
EOL


# --- ARREGLO 8: Asegurar que src/lib/db/index.js exporta el pool para conexiones seguras y transacciones (RENDER) ---
echo "8. Corrigiendo src/lib/db/index.js para exportar la Pool instance para conexiones seguras y transacciones..."
cat > src/lib/db/index.js << 'EOL'
const { Pool } = require('pg');

let pool;

// Usamos un singleton global para mantener una sola Pool de conexiones.
if (!global._pool) {
  // Configuración para permitir conexiones seguras necesarias en Vercel/Render
  global._pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
}
pool = global._pool;

// Exportamos un objeto con el método query (para compatibilidad) y la pool raw.
const db = {
  query: (text, params) => pool.query(text, params),
  pool: pool, // Exponemos el pool para usar .connect() en transacciones
};

export default db; // Exportamos el objeto 'db' por defecto
EOL

echo "¡Corrección completada! Sube estos archivos a tu repositorio para desplegar."