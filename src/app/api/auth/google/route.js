import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { db } from '@/lib/db';
import { getUserByEmail, createUser } from '@/lib/auth/utils';

// Importa las variables de entorno para Google
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'No se proporcionó un código de autenticación.' }, { status: 400 });
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2',
    });

    // Captura errores específicos aquí
    try {
      const { data } = await oauth2.userinfo.get();
      const user = await getUserByEmail(data.email);

      if (!user) {
        await createUser({
          name: data.name,
          email: data.email,
          image: data.picture,
          googleId: data.id,
        });
      }

      const redirectUrl = `http://localhost:3000/dashboard?token=${tokens.access_token}`;
      return NextResponse.redirect(redirectUrl);
    } catch (apiError) {
      console.error('Error al obtener la información del usuario desde Google:', apiError);
      return NextResponse.json({ error: 'Hubo un error al obtener tu información de Google.' }, { status: 500 });
    }
  } catch (authError) {
    console.error('Error durante la autenticación de Google:', authError);
    return NextResponse.json({ error: `Hubo un error con la autenticación de Google: ${authError.message}` }, { status: 500 });
  }
}