import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import db from '@/lib/db'; // Cambiado de 'pool' a 'db' para consistencia
import { createToken } from '@/lib/auth/utils';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  
  // Novedad: Leer el parámetro 'redirect_to' de la URL
  const redirectTo = url.searchParams.get('redirect_to');

  if (!code) {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
      prompt: 'consent',
      // Novedad: Asegurar que el parámetro 'redirect_to' se mantenga
      state: redirectTo ? `redirect_to=${encodeURIComponent(redirectTo)}` : undefined,
    });
    return NextResponse.redirect(authUrl);
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2'
    });
    const userInfo = await oauth2.userinfo.get();

    let user = null;
    // Usamos db.query
    const existingUser = await db.query('SELECT * FROM users WHERE email = $1', [userInfo.data.email]);
    
    if (existingUser.rows.length > 0) {
      user = existingUser.rows[0];
    } else {
      // Usamos db.query
      const newUserResult = await db.query(
        'INSERT INTO users (username, email, google_id) VALUES ($1, $2, $3) RETURNING *',
        [userInfo.data.name, userInfo.data.email, userInfo.data.id]
      );
      user = newUserResult.rows[0];
    }

    const token = createToken(user);
    
    // Novedad: Redirigir a la URL especificada o al dashboard por defecto
    const finalRedirectPath = url.searchParams.get('state')?.includes('redirect_to=')
      ? decodeURIComponent(url.searchParams.get('state').split('redirect_to=')[1])
      : '/dashboard';

    const redirectUrl = new URL(finalRedirectPath, url.origin);
    redirectUrl.searchParams.set('token', token);
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('Error al procesar el login de Google:', error);
    // Este es el error que ve el usuario. Lo mantenemos para el fallback.
    return NextResponse.json({ error: 'Hubo un error con la autenticación de Google.' }, { status: 500 });
  }
}
