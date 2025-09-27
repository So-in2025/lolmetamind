// src/app/api/auth/google/callback/route.js

import { NextResponse } from 'next/server';
import passport, { createToken } from '../../../../../lib/auth/utils'; // Importamos passport y createToken
import { promisify } from 'util';

// 🚨 SOLUCIÓN AL ERROR 'Dynamic server usage'
// Esto le dice a Next.js que esta ruta SIEMPRE debe ejecutarse en el servidor.
export const dynamic = 'force-dynamic';

const authenticate = promisify(passport.authenticate('google', { session: false, failureRedirect: '/login/error' }));

export async function GET(req, res) {
  try {
    // Passport maneja la autenticación y nos devuelve el usuario de la DB
    const user = await authenticate(req, res);

    if (!user) {
      throw new Error("La autenticación con Passport falló.");
    }
    
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
    const redirectUrl = new URL(process.env.NEXT_PUBLIC_BASE_URL); // Usamos la URL base de tu app
    redirectUrl.pathname = '/auth/google/callback'; // Mantenemos una ruta limpia
    redirectUrl.searchParams.set('user', userData);
    redirectUrl.searchParams.set('token', token);

    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error("Error en el callback de Google:", error);
    const errorUrl = new URL('/login/error', process.env.NEXT_PUBLIC_BASE_URL);
    errorUrl.searchParams.set('message', 'Ocurrió un error en el servidor durante la autenticación.');
    return NextResponse.redirect(errorUrl);
  }
}