#!/bin/bash

echo "Creando estructura de archivos para el sistema de licencias y Hotmart..."

# --- Creación del Endpoint para verificar la licencia ---
mkdir -p src/app/api/license/verify
cat > src/app/api/license/verify/route.js << EOL
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
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

# --- Creación del Endpoint para el Webhook de Hotmart ---
mkdir -p src/app/api/hotmart-webhook
cat > src/app/api/hotmart-webhook/route.js << EOL
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req) {
  try {
    // IMPORTANTE: Hotmart puede enviar datos como 'form-data', no JSON.
    // next/server maneja esto automáticamente con req.formData().
    const formData = await req.formData();
    const hotmartEvent = Object.fromEntries(formData.entries());

    console.log('Webhook de Hotmart recibido:', hotmartEvent);

    // Medida de seguridad: Verifica el token secreto de Hotmart
    const hotmartToken = req.headers.get('x-hotmart-hottok');
    if (hotmartToken !== process.env.HOTMART_WEBHOOK_SECRET) {
      console.warn('Intento de webhook no autorizado. Token recibido:', hotmartToken);
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const eventType = hotmartEvent.event;
    const userEmail = hotmartEvent.email;
    const subscriptionId = hotmartEvent.subscription;

    if (!userEmail) {
        return NextResponse.json({ message: 'Email no proporcionado en el evento.' }, { status: 400 });
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
        } else {
            // Si el usuario no existe, puedes decidir crearlo aquí.
            console.warn(\`Webhook: Usuario \${userEmail} no encontrado.\`);
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

# --- Creación del Endpoint para activar la prueba gratuita ---
mkdir -p src/app/api/activate-trial
cat > src/app/api/activate-trial/route.js << EOL
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth'; // Asumo que tienes una función para obtener la sesión

export async function POST(req) {
    try {
        const session = await getSession(); // Obtener la sesión del usuario logueado
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userResult = await db.query('SELECT * FROM users WHERE id = $1', [session.user.id]);
        const user = userResult.rows[0];

        if (!user) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }
        
        // Verificar que el usuario sea elegible para la prueba
        if (user.subscription_tier !== 'FREE' || user.trial_ends_at) {
            return NextResponse.json({ error: 'Este usuario no es elegible para una prueba.' }, { status: 403 });
        }

        // Activar la prueba
        const trialEndDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 días desde ahora
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

echo "¡Estructura de archivos creada con éxito!"
echo "No olvides añadir tu HOTMART_WEBHOOK_SECRET a tus variables de entorno (.env)."