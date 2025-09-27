import { NextResponse } from 'next/server';
import passport from '@/lib/auth/utils'; // Ya usa el archivo correcto
import { promisify } from 'util';

export const dynamic = 'force-dynamic';

const authenticate = promisify(passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

export async function GET(req) {
  try {
    // Esta ruta inicia el flujo, no necesita la DB directamente, solo Passport
    await authenticate(req);
    // Passport se encarga de la redirección a Google, por lo que esta respuesta no se envía
    return NextResponse.json({ message: 'Redirigiendo a Google...' });
  } catch (error) {
    console.error('Error al iniciar autenticación con Google:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}