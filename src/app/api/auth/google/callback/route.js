import { NextResponse } from 'next/server';
import passport from '../../../../../lib/auth/utils'; // Importamos nuestra config de passport
import jwt from 'jsonwebtoken';
import { promisify } from 'util';

// Convertimos el middleware de passport a una promesa para usarlo con async/await
const authenticate = promisify(passport.authenticate('google', { session: false }));

export async function GET(req) {
    try {
        // Ejecutamos la autenticación de Passport
        const user = await authenticate(req);
        
        if (!user) {
            // Si por alguna razón no hay usuario, redirigimos con error
            const errorUrl = new URL('/login/error', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
            errorUrl.searchParams.set('message', 'No se pudo autenticar al usuario.');
            return NextResponse.redirect(errorUrl);
        }

        // Si el usuario es autenticado, creamos el Token (JWT)
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET, // Asegúrate de tener esta variable en Render
            { expiresIn: '7d' }
        );

        // --- EL PASO CLAVE PARA ELECTRON ---
        // Preparamos los datos para enviarlos de vuelta a la app de escritorio
        const userData = JSON.stringify({
            id: user.id,
            displayName: user.displayName,
            email: user.email,
            avatarUrl: user.avatarUrl,
            hasCompletedOnboarding: user.has_completed_onboarding || false
        });

        // Construimos la URL de redirección final que main.js está escuchando
        const redirectUrl = new URL(req.url); // Reutilizamos la URL base
        redirectUrl.searchParams.set('user', userData);
        redirectUrl.searchParams.set('token', token);

        console.log("Redirigiendo a la app de escritorio con éxito.");
        
        // Redirigimos. main.js capturará esta URL y cerrará la ventana.
        return NextResponse.redirect(redirectUrl);

    } catch (error) {
        console.error("Error en el callback de Google:", error);
        // En caso de error, redirigimos a una página de error genérica
        const errorUrl = new URL('/login/error', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
        errorUrl.searchParams.set('message', 'Ocurrió un error en el servidor.');
        return NextResponse.redirect(errorUrl);
    }
}