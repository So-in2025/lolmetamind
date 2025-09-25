import { NextResponse } from 'next/server';
import db from '@/lib/db';
import jwt from 'jsonwebtoken'; // Importamos la librería JWT

export async function POST(req) {
  try {
    const { licenseKey } = await req.json();
    
    // Añadimos la key maestra para desarrollo
    if (licenseKey === 'SO-IN-MASTER-KEY-2025') {
        console.log('Master Key access granted.');
        // Creamos un token para el usuario maestro
        const token = jwt.sign({ userId: 'master-user', licenseKey: 'master-key', tier: 'PREMIUM' }, process.env.JWT_SECRET, { expiresIn: '1d' });
        return NextResponse.json({ status: 'active', tier: 'premium', token: token }); // Devolvemos el token
    }

    if (!licenseKey) {
      return NextResponse.json({ error: 'Clave de licencia no proporcionada' }, { status: 400 });
    }

    const userResult = await db.query('SELECT * FROM users WHERE "license_key" = $1', [licenseKey]);

    if (userResult.rows.length === 0) {
      return NextResponse.json({ status: 'invalid', message: 'Clave no encontrada' }, { status: 404 });
    }

    const user = userResult.rows[0];
    let tokenPayload = { userId: user.id, licenseKey: user.license_key, tier: user.subscription_tier };
    let token;

    if (user.subscription_tier === 'PREMIUM') {
      token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '30d' }); // Token dura 30 días
      return NextResponse.json({ status: 'active', tier: 'premium', token: token }); // Devolvemos el token
    }

    if (user.subscription_tier === 'TRIAL') {
      const trialEndDate = new Date(user.trial_ends_at);
      const now = new Date();

      if (trialEndDate > now) {
        const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: `${daysRemaining}d` }); // Token dura lo que quede del trial
        return NextResponse.json({ status: 'active', tier: 'trial', daysRemaining, token: token }); // Devolvemos el token
      } else {
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