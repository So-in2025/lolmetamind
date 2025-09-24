#!/bin/bash

echo "Realizando correcciones finales para las importaciones de la base de datos..."

# --- Paso 1: Modificar src/lib/db/index.js para usar exportación por defecto ---
echo "Actualizando src/lib/db/index.js para exportar la base de datos por defecto..."
cat > src/lib/db/index.js << EOL
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Ahora exportamos el objeto 'db' por defecto
const db = {
  query: (text, params) => pool.query(text, params),
};

export default db; // <-- ¡ESTO ES LO CLAVE!
EOL

# --- Paso 2: Corregir el endpoint para activar la prueba para importar 'db' por defecto ---
echo "Corrigiendo src/app/api/activate-trial/route.js para importar 'db' por defecto..."
cat > src/app/api/activate-trial/route.js << EOL
import { NextResponse } from 'next/server';
import db from '@/lib/db'; // Importación por defecto
import { auth } from '@clerk/nextjs/server';

export async function POST(req) {
    try {
        const { userId } = auth();
        if (!userId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userResult = await db.query('SELECT * FROM users WHERE google_id = $1', [userId]);
        const user = userResult.rows[0];

        if (!user) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }
        
        if (user.subscription_tier !== 'FREE' || user.trial_ends_at) {
            return NextResponse.json({ error: 'Este usuario no es elegible para una prueba.' }, { status: 403 });
        }

        const trialEndDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        await db.query(
            'UPDATE users SET "subscription_tier" = \\'TRIAL\\', "trial_ends_at" = $1 WHERE id = $2',
            [trialEndDate, user.id]
        );

        return NextResponse.json({ message: 'Prueba de 3 días activada con éxito.' });

    } catch (error) {
        console.error('Error al activar la prueba:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
EOL

# --- Paso 3: Corregir el endpoint del webhook de Hotmart para importar 'db' por defecto ---
echo "Corrigiendo src/app/api/hotmart-webhook/route.js para importar 'db' por defecto..."
cat > src/app/api/hotmart-webhook/route.js << EOL
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
    const subscriptionId = hotmartEvent.sub_id;

    if (!userEmail) {
        return NextResponse.json({ message: 'Email no proporcionado.' }, { status: 400 });
    }

    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [userEmail]);
    let user = userResult.rows[0];

    if (eventType === 'PURCHASE_APPROVED' || eventType === 'SUBSCRIPTION_ACTIVATED') {
        if (user) {
            await db.query(
              'UPDATE users SET "subscription_tier" = \\'PREMIUM\\', "hotmart_subscription_id" = $1 WHERE email = $2',
              [subscriptionId, userEmail]
            );
            console.log(\`Usuario \${userEmail} actualizado a PREMIUM.\`);
        }
    } else if (eventType === 'SUBSCRIPTION_CANCELED' || eventType === 'PURCHASE_REFUNDED') {
        if (user) {
            await db.query(
              'UPDATE users SET "subscription_tier" = \\'FREE\\', "hotmart_subscription_id" = NULL WHERE email = $1',
              [userEmail]
            );
            console.log(\`Suscripción de \${userEmail} cancelada.\`);
        }
    }

    return NextResponse.json({ message: 'Webhook procesado' }, { status: 200 });

  } catch (error) {
    console.error('Error al procesar webhook de Hotmart:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
EOL

# --- Paso 4: Corregir el endpoint de verificación de licencia para importar 'db' por defecto ---
echo "Corrigiendo src/app/api/license/verify/route.js para importar 'db' por defecto..."
cat > src/app/api/license/verify/route.js << EOL
import { NextResponse } from 'next/server';
import db from '@/lib/db'; // Importación por defecto
import { v4 as uuidv4 } from 'uuid';

export async function POST(req) {
  try {
    const { licenseKey } = await req.json();

    if (!licenseKey) {
      return NextResponse.json({ error: 'Clave de licencia no proporcionada' }, { status: 400 });
    }

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
        await db.query('UPDATE users SET "subscription_tier" = \\'FREE\\' WHERE "license_key" = $1', [licenseKey]);
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

echo "¡Corrección de importaciones completada!"
echo "Ahora, sube los cambios a GitHub para que el despliegue funcione correctamente."
echo "Ejecuta los siguientes comandos:"
echo "1. git add ."
echo "2. git commit -m \"Fix: Standardize DB imports as default\""
echo "3. git push"