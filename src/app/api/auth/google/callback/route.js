import { NextResponse } from 'next/server';
import axios from 'axios';

// 🚨 Asegúrate de que tu backend tenga acceso a estas variables de entorno de Render:
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI; // La URL de callback de Render
const FINAL_REDIRECT_URL = 'https://couchmetamind.vercel.app/auth-callback'; // La URL que Electron intercepta

/**
 * Función que se ejecuta cuando Google redirige el código de autorización.
 * Ruta: /api/auth/google/callback
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    
    // Si no hay código, algo salió mal
    if (!code) {
        console.error("Callback: No se recibió el código de Google.");
        return new NextResponse("Error: No se recibió el código de autorización.", { status: 400 });
    }

    try {
        // 1. INTERCAMBIAR EL CÓDIGO POR EL TOKEN DE ACCESO (SERVER-TO-SERVER)
        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            code: code,
            redirect_uri: GOOGLE_REDIRECT_URI, // Usamos la URI registrada en Google
            grant_type: 'authorization_code',
        });

        const accessToken = tokenResponse.data.access_token;
        
        // 2. OBTENER INFORMACIÓN DEL USUARIO (Opcional, pero esencial para el dashboard)
        const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        const userData = userResponse.data;
        
        // 3. GENERAR O BUSCAR EL TOKEN JWT DE TU APLICACIÓN (Aquí debes implementar tu lógica de JWT)
        // Lógica de JWT Simulada:
        const userToken = `JWT_MOCK_${userData.id}_${Date.now()}`;
        const isNewUser = true; // Asume que es nuevo para forzar el Onboarding
        
        // 4. REDIRECCIÓN FINAL PARA ELECTRON
        // Redirigimos a una URL donde Electron puede interceptar el token.
        const finalUrl = new URL(FINAL_REDIRECT_URL);
        finalUrl.searchParams.set('token', userToken);
        finalUrl.searchParams.set('isNewUser', isNewUser);
        
        console.log(`[AUTH CALLBACK] ✅ Autenticación exitosa. Redirigiendo a: ${finalUrl.toString()}`);

        // Electron está escuchando esta URL y capturará el token
        return NextResponse.redirect(finalUrl.toString());

    } catch (error) {
        console.error("Error en el intercambio de tokens:", error.response?.data || error.message);
        
        // Si hay un error, redirigir a una página de error visible para el usuario
        const errorUrl = new URL(FINAL_REDIRECT_URL);
        errorUrl.searchParams.set('error', 'AuthFailed');
        return NextResponse.redirect(errorUrl.toString());
    }
}
