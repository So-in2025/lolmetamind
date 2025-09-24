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

    const userResult = await db.query('SELECT * FROM users WHERE email = ', [userEmail]);
    let user = userResult.rows[0];

    if (eventType === 'PURCHASE_APPROVED' || eventType === 'SUBSCRIPTION_ACTIVATED') {
        if (user) {
            await db.query(
              'UPDATE users SET "subscription_tier" = \'PREMIUM\', "hotmart_subscription_id" =  WHERE email = ',
              [subscriptionId, userEmail]
            );
            console.log(`Usuario ${userEmail} actualizado a PREMIUM.`);
        }
    } else if (eventType === 'SUBSCRIPTION_CANCELED' || eventType === 'PURCHASE_REFUNDED') {
        if (user) {
            await db.query(
              'UPDATE users SET "subscription_tier" = \'FREE\', "hotmart_subscription_id" = NULL WHERE email = ',
              [userEmail]
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
