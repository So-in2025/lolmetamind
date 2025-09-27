// src/app/api/auth/google/route.js

import { NextResponse } from 'next/server';
import passport from '@/lib/auth/utils';

// 🚨 SOLUCIÓN: Hacemos que la ruta sea dinámica
export const dynamic = 'force-dynamic';

// Usamos un truco para que passport.authenticate funcione en este entorno
const handler = (req) => new Promise((resolve) => {
    // Cuando passport redirige, lo capturamos y lo enviamos como respuesta
    const customRes = {
        redirect: (url) => resolve(NextResponse.redirect(url)),
        end: () => resolve(NextResponse.json({ error: 'Fallo en la autenticación' }, { status: 401 })),
        setHeader: () => {}, // Función vacía para compatibilidad
    };
    passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, customRes);
});

export async function GET(req) {
    try {
        return await handler(req);
    } catch (error) {
        console.error("Error al iniciar autenticación con Google:", error);
        return NextResponse.json({ message: 'Error interno del servidor al iniciar login' }, { status: 500 });
    }
}