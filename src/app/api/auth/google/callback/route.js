// src/app/api/auth/google/callback/route.js

import { NextResponse } from 'next/server';
import passport, { createToken } from '@/lib/auth/utils';
import { promisify } from 'util';

// 🚨 SOLUCIÓN: Hacemos la ruta dinámica
export const dynamic = 'force-dynamic';

// Creamos una función de autenticación compatible
const authenticate = (req) => new Promise((resolve, reject) => {
    passport.authenticate('google', { session: false }, (err, user, info) => {
        if (err) return reject(err);
        if (!user) return reject(new Error('La autenticación con Passport falló.'));
        resolve(user);
    })(req);
});

export async function GET(req) {
  try {
    const user = await authenticate(req);

    // Creamos el token de sesión
    const token = createToken(user);

    // Preparamos los datos del usuario para enviarlos a la app de Electron
    const userData = JSON.stringify({
        id: user._id,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        hasCompletedOnboarding: user.has_completed_onboarding
    });
    
    // Construimos la URL de redirección final que nuestro main.js está esperando
    // Usamos la URL base del backend para la redirección
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.get('host')}`;
    const redirectUrl = new URL(baseUrl);
    redirectUrl.pathname = '/auth/google/callback'; // Mantenemos la ruta para que main.js la detecte
    redirectUrl.searchParams.set('user', userData);
    redirectUrl.searchParams.set('token', token);

    return NextResponse.redirect(redirectUrl.toString());

  } catch (error) {
    console.error("Error en el callback de Google:", error);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.get('host')}`;
    const errorUrl = new URL('/login/error', baseUrl);
    errorUrl.searchParams.set('message', 'Ocurrió un error en el servidor durante la autenticación.');
    return NextResponse.redirect(errorUrl.toString());
  }
}