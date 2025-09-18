import { NextResponse } from 'next/server';

const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

export async function GET(request) {
  // Retorna el valor de la variable de entorno y el client ID para su verificación
  return NextResponse.json({
    message: 'Debug Mode: Verifying environment variables',
    GOOGLE_REDIRECT_URI: GOOGLE_REDIRECT_URI,
    GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID,
  });
}
