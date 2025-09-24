import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req) {
  try {
    const { licenseKey } = await req.json();

    if (!licenseKey) {
      return NextResponse.json({ error: 'Clave de licencia no proporcionada' }, { status: 400 });
    }

    const userResult = await db.query('SELECT * FROM users WHERE "license_key" = ', [licenseKey]);

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
        await db.query('UPDATE users SET "subscription_tier" = \'FREE\' WHERE "license_key" = ', [licenseKey]);
        return NextResponse.json({ status: 'expired', message: 'La prueba ha expirado' });
      }
    }
    
    return NextResponse.json({ status: 'inactive', message: 'Tu cuenta no tiene una suscripción activa.' });

  } catch (error) {
    console.error('Error de verificación de licencia:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
