import { NextResponse } from 'next/server';
import axios from 'axios';

// 🚨 Asegúrate de que tu backend tenga acceso a estas variables de entorno de Render:
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI; // La URL de callback de Render
const FINAL_REDIRECT_URL = process.env.FINAL_REDIRECT_URL; // La URL que Electron intercepta

/**
 * Función que se ejecuta cuando Google redirige el código de autorización.
 * Ruta: /api/auth/google/callback
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    
    // Si no hay código, algo salió mal (ej: el usuario canceló)
    if (!code) {
        console.error("[AUTH CALLBACK] Error: No se recibió el código de Google. (Usuario canceló o error de Google).");
        const errorUrl = new URL(FINAL_REDIRECT_URL);
        errorUrl.searchParams.set('error', 'access_denied');
        return NextResponse.redirect(errorUrl.toString());
    }

    try {
        console.log("[AUTH CALLBACK] DEBUG: Código recibido. Iniciando intercambio por tokens...");
        
        // 1. INTERCAMBIAR EL CÓDIGO POR EL TOKEN DE ACCESO (SERVER-TO-SERVER)
        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            code: code,
            redirect_uri: GOOGLE_REDIRECT_URI, // Usamos la URI registrada en Google (Render URL)
            grant_type: 'authorization_code',
        });
        
        // 🚨 LOG DE ÉXITO: Si llega aquí, el intercambio con Google fue exitoso.
        console.log("[AUTH CALLBACK] DEBUG: Tokens obtenidos con éxito. Petición de datos de usuario...");

        const accessToken = tokenResponse.data.access_token;
        
        // 2. OBTENER INFORMACIÓN DEL USUARIO (SERVER-TO-SERVER)
        const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        const userData = userResponse.data;
        
        // 3. GENERAR O BUSCAR EL TOKEN JWT DE TU APLICACIÓN
        const userToken = `JWT_MOCK_${userData.id}_${Date.now()}`;
        const isNewUser = true; 
        
        console.log(`[AUTH CALLBACK] ✅ Token generado. Usuario: ${userData.email}.`);
        
        // 4. REDIRECCIÓN FINAL PARA ELECTRON
        const finalUrl = new URL(FINAL_REDIRECT_URL);
        finalUrl.searchParams.set('token', userToken);
        finalUrl.searchParams.set('isNewUser', isNewUser);
        
        console.log(`[AUTH CALLBACK] ➡️ Redirigiendo cliente Electron a: ${finalUrl.toString()}`);

        return NextResponse.redirect(finalUrl.toString());

    } catch (error) {
        // 🚨 LOG DE FALLO CRÍTICO: Capturamos la respuesta de Google que causó la falla.
        const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error(`[AUTH CALLBACK] 💥 ERROR CRÍTICO. El servidor de Render falló en el intercambio. Detalles: ${errorDetails}`);
        
        // Redirigir a una página de error visible para el usuario
        const errorUrl = new URL(FINAL_REDIRECT_URL);
        errorUrl.searchParams.set('error', 'AuthFailed');
        return NextResponse.redirect(errorUrl.toString());
    }
}