// src/app/api/auth/google/callback/route.js

import { NextResponse } from 'next/server';
import passport, { createToken } from '@/lib/auth/utils';
import { promisify } from 'util';

export const dynamic = 'force-dynamic';

// Creamos una versión "promisificada" del middleware de Passport
const passportAuthenticate = promisify(passport.authenticate);

export async function GET(req) {
  try {
    // Autenticamos al usuario usando la petición que nos llega de Google
    const user = await passportAuthenticate('google', { session: false }, req);
    
    if (!user) {
        throw new Error("No se pudo autenticar al usuario desde Google.");
    }
    
    // Creamos el token de sesión (JWT)
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
    const baseUrl = req.nextUrl.origin; // Obtenemos la URL base de la petición actual
    const redirectUrl = new URL('/auth/google/callback', baseUrl);
    redirectUrl.searchParams.set('user', userData);
    redirectUrl.searchParams.set('token', token);

    // Redirigimos a la app de Electron, que capturará esta URL y cerrará la ventana
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error("Error en el callback de Google:", error);
    const baseUrl = req.nextUrl.origin;
    const errorUrl = new URL('/login-error', baseUrl); // Una ruta de error genérica
    errorUrl.searchParams.set('message', 'Error en el servidor de autenticación.');
    return NextResponse.redirect(errorUrl);
  }
}