import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import pool from '@/lib/db';
import { createToken } from '@/lib/auth/utils';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const JWT_SECRET = process.env.JWT_SECRET;

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  // Si no hay 'code', es el inicio del flujo. Redirigimos a Google.
  if (!code) {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
      prompt: 'consent'
    });
    return NextResponse.redirect(authUrl);
  }

  // Si hay 'code', es el regreso de Google. Intercambiamos el token.
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2'
    });
    const userInfo = await oauth2.userinfo.get();

    let user = null;
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [userInfo.data.email]);
    
    // Si el usuario ya existe, lo actualizamos.
    if (existingUser.rows.length > 0) {
      user = existingUser.rows[0];
    } else {
    // Si es un usuario nuevo, lo registramos.
      const newUserResult = await pool.query(
        'INSERT INTO users (username, email, google_id) VALUES ($1, $2, $3) RETURNING *',
        [userInfo.data.name, userInfo.data.email, userInfo.data.id]
      );
      user = newUserResult.rows[0];
    }

    // Creamos el token de sesión
    const token = createToken({ userId: user.id, username: user.username });
    
    // Redirigimos al dashboard con el token
    const redirectUrl = new URL('/dashboard', url.origin);
    redirectUrl.searchParams.set('token', token);
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('Error al procesar el login de Google:', error);
    return NextResponse.json({ error: 'Hubo un error con la autenticación de Google.' }, { status: 500 });
  }
}
